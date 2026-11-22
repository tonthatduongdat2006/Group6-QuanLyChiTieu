#!/usr/bin/env python3
"""Validate AI fixtures (P0-TD-04).

Planning: docs/task-breakdown.md P0-TD-04 ("Validate fixture theo schema"),
docs/test-strategy.md §6 ("Mỗi fixture có schema validate và tên ổn định").

- Envelope: fixture.schema.json (JSON Schema subset, see `check()`).
- Enums / money / date formats: refs prefixed with "openapi:" resolve into
  packages/contracts/openapi.yaml, so fixtures follow the existing contract.
- Extra semantic rules: stable id = <group>.<file>, unique ids, kind/input
  match, provider error -> API v1.1 §12 code (IT-PROVIDER-MAP), receipt sums.

Needs only Python 3 + PyYAML (same as packages/contracts/validate.sh).
Usage:  python3 validate_fixtures.py            validate all fixtures
        python3 validate_fixtures.py --self-test also prove that broken
                                                 fixtures are rejected
Exit code: 0 = all valid, 1 = at least one problem.
"""

import copy
import datetime
import json
import os
import re
import sys

try:
    import yaml
except ImportError:
    print("FAIL: PyYAML is required (same requirement as packages/contracts/validate.sh)")
    sys.exit(1)

HERE = os.path.dirname(os.path.abspath(__file__))
SCHEMA_PATH = os.path.join(HERE, "fixture.schema.json")
OPENAPI_PATH = os.path.normpath(os.path.join(HERE, "..", "..", "openapi.yaml"))
GROUPS = ("chat", "scan", "error", "adversarial")
PROVIDER_ERROR_CODE = {"timeout": "AI_PROVIDER_ERROR", "server_error": "AI_PROVIDER_ERROR",
                       "rate_limited": "RATE_LIMITED"}

with open(SCHEMA_PATH, encoding="utf-8") as fh:
    SCHEMA = json.load(fh)
with open(OPENAPI_PATH, encoding="utf-8") as fh:
    OPENAPI = yaml.safe_load(fh)

TYPE_CHECKS = {
    "object": lambda v: isinstance(v, dict),
    "array": lambda v: isinstance(v, list),
    "string": lambda v: isinstance(v, str),
    "integer": lambda v: isinstance(v, int) and not isinstance(v, bool),
    "number": lambda v: isinstance(v, (int, float)) and not isinstance(v, bool),
    "boolean": lambda v: isinstance(v, bool),
    "null": lambda v: v is None,
}


def resolve(ref):
    if ref.startswith("openapi:#/"):
        node, parts = OPENAPI, ref[len("openapi:#/"):].split("/")
        prefix = "openapi:#/"
    elif ref.startswith("#/"):
        node, parts = SCHEMA, ref[2:].split("/")
        prefix = "#/"
    else:
        raise ValueError(f"unsupported $ref {ref}")
    for part in parts:
        node = node[part]
    return node, prefix


def valid_date(value):
    try:
        datetime.date.fromisoformat(value)
        return re.fullmatch(r"\d{4}-\d{2}-\d{2}", value) is not None
    except ValueError:
        return False


def check(value, schema, path, errors, ref_prefix="#/"):
    """Validate `value` against a JSON Schema subset used by fixture.schema.json
    and the referenced OpenAPI component schemas."""
    if "$ref" in schema:
        ref = schema["$ref"]
        if ref.startswith("#/") and ref_prefix == "openapi:#/":
            ref = "openapi:" + ref  # local ref inside an OpenAPI schema
        target, prefix = resolve(ref)
        check(value, target, path, errors, prefix)
        return
    if "oneOf" in schema:
        matches = 0
        for option in schema["oneOf"]:
            sub = []
            check(value, option, path, sub, ref_prefix)
            matches += not sub
        if matches != 1:
            errors.append(f"{path}: must match exactly one schema in oneOf (matched {matches})")
        return
    types = schema.get("type")
    if types is not None:
        types = types if isinstance(types, list) else [types]
        if not any(TYPE_CHECKS[t](value) for t in types):
            errors.append(f"{path}: expected type {types}, got {type(value).__name__}")
            return
    if "const" in schema and value != schema["const"]:
        errors.append(f"{path}: must equal {schema['const']!r}")
    if "enum" in schema and value not in schema["enum"]:
        errors.append(f"{path}: {value!r} not in enum {schema['enum']}")
    if isinstance(value, str):
        if "pattern" in schema and re.search(schema["pattern"], value) is None:
            errors.append(f"{path}: {value!r} does not match pattern {schema['pattern']}")
        if "minLength" in schema and len(value) < schema["minLength"]:
            errors.append(f"{path}: shorter than {schema['minLength']}")
        if schema.get("format") == "date" and not valid_date(value):
            errors.append(f"{path}: {value!r} is not a valid YYYY-MM-DD date")
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if "minimum" in schema and value < schema["minimum"]:
            errors.append(f"{path}: below minimum {schema['minimum']}")
        if "maximum" in schema and value > schema["maximum"]:
            errors.append(f"{path}: above maximum {schema['maximum']}")
    if isinstance(value, list):
        if "minItems" in schema and len(value) < schema["minItems"]:
            errors.append(f"{path}: needs at least {schema['minItems']} items")
        if "items" in schema:
            for i, item in enumerate(value):
                check(item, schema["items"], f"{path}[{i}]", errors, ref_prefix)
    if isinstance(value, dict):
        props = schema.get("properties", {})
        for key in schema.get("required", []):
            if key not in value:
                errors.append(f"{path}: missing required property '{key}'")
        for key, item in value.items():
            if key in props:
                check(item, props[key], f"{path}.{key}", errors, ref_prefix)
            elif schema.get("additionalProperties") is False:
                errors.append(f"{path}: unexpected property '{key}'")


def money(value):
    return int(value) if isinstance(value, str) and value.isdigit() else None


def semantic_checks(fx, group, stem, errors):
    if fx.get("group") != group:
        errors.append(f"group '{fx.get('group')}' does not match directory '{group}'")
    if fx.get("id") != f"{group}.{stem}":
        errors.append(f"id '{fx.get('id')}' must be '{group}.{stem}' (stable name)")
    kind = fx.get("kind")
    if group in ("chat", "scan") and kind != group:
        errors.append(f"kind '{kind}' must be '{group}' for group '{group}'")
    if group in ("error", "adversarial") and not stem.startswith(f"{kind}-"):
        errors.append(f"file name must start with '{kind}-' for kind '{kind}'")
    inp = fx.get("input", {})
    if kind == "chat" and "message" not in inp:
        errors.append("chat fixture needs input.message")
    if kind == "scan" and "image" not in inp:
        errors.append("scan fixture needs input.image")

    provider, expected = fx.get("provider", {}), fx.get("expected", {})
    outcomes = expected.get("outcome_any_of", [])
    if provider.get("result") == "output" and not provider.get("malformed"):
        defn = "#/$defs/chatProviderOutput" if kind == "chat" else "#/$defs/scanProviderOutput"
        sub = []
        check(provider.get("output"), {"$ref": defn}, "provider.output", sub)
        errors.extend(sub)
    if provider.get("result") == "error":
        want = PROVIDER_ERROR_CODE.get(provider.get("error", {}).get("kind"))
        if outcomes != ["ERROR"]:
            errors.append("provider error must expect outcome_any_of == ['ERROR']")
        if expected.get("error_code") != want:
            errors.append(f"provider error kind maps to {want} (IT-PROVIDER-MAP), got {expected.get('error_code')}")
    if outcomes == ["ERROR"] and "error_code" not in expected:
        errors.append("outcome ERROR requires expected.error_code")
    if "ERROR" not in outcomes and "error_code" in expected:
        errors.append("error_code given but ERROR is not an allowed outcome")

    if kind == "scan" and provider.get("result") == "output" and "confirmable" in expected:
        out = provider.get("output", {})
        amounts = [money(i.get("amount")) for i in out.get("items", [])]
        total = money(out.get("total"))
        complete = bool(amounts) and None not in amounts and total is not None \
            and all(i.get("name") for i in out.get("items", []))
        sums_match = complete and sum(amounts) == total
        if expected["confirmable"] != sums_match:
            errors.append(f"confirmable={expected['confirmable']} contradicts provider output "
                          f"(items complete={complete}, sum matches total={sums_match})")


def validate_file(path, group, seen_ids):
    errors = []
    try:
        with open(path, encoding="utf-8") as fh:
            fx = json.load(fh)
    except (OSError, json.JSONDecodeError) as exc:
        return [f"cannot read JSON: {exc}"], None
    return validate_fixture(fx, group, os.path.basename(path)[:-5], seen_ids), fx.get("id")


def validate_fixture(fx, group, stem, seen_ids):
    errors = []
    check(fx, SCHEMA, "$", errors)
    semantic_checks(fx, group, stem, errors)
    fid = fx.get("id")
    if fid in seen_ids:
        errors.append(f"duplicate id '{fid}'")
    seen_ids.add(fid)
    return errors


def collect():
    files = []
    for group in GROUPS:
        directory = os.path.join(HERE, group)
        if not os.path.isdir(directory):
            continue
        for name in sorted(os.listdir(directory)):
            if name.endswith(".json"):
                files.append((group, os.path.join(directory, name)))
    unexpected = [d for d in os.listdir(HERE)
                  if os.path.isdir(os.path.join(HERE, d)) and d not in GROUPS and not d.startswith((".", "__"))]
    return files, unexpected


def self_test(files):
    """Mutate a valid fixture in memory and confirm each mutation is rejected."""
    group, path = next((g, p) for g, p in files if g == "scan" and p.endswith("readable.json"))
    with open(path, encoding="utf-8") as fh:
        base = json.load(fh)
    stem = os.path.basename(path)[:-5]

    def mutate(fn):
        fx = copy.deepcopy(base)
        fn(fx)
        return fx

    cases = {
        "money not a positive string": mutate(lambda f: f["expected"]["drafts"][0].update(amount="-55000")),
        "unknown DraftStatus enum": mutate(lambda f: f["expected"].update(forbidden_draft_statuses=["DONE"])),
        "persists_transaction true": mutate(lambda f: f["expected"].update(persists_transaction=True)),
        "unstable id": mutate(lambda f: f.update(id="scan.something-else")),
        "invalid calendar date": mutate(lambda f: f["provider"]["output"].update(date="2026-02-30")),
        "confirmable contradicts sums": mutate(lambda f: f["provider"]["output"].update(total="99999")),
        "unexpected property": mutate(lambda f: f.update(extra=1)),
        "non-VN clock offset": mutate(lambda f: f["clock"].update(now="2026-11-15T02:00:00Z")),
    }
    failures = 0
    for name, fx in cases.items():
        errs = validate_fixture(fx, group, stem, set())
        status = "rejected" if errs else "NOT REJECTED"
        failures += not errs
        print(f"  self-test {'OK  ' if errs else 'FAIL'} {name}: {status}")
    return failures


def main():
    files, unexpected = collect()
    problems, seen = 0, set()
    print(f"AI fixtures: {HERE}")
    print(f"OpenAPI    : {OPENAPI_PATH}")
    if not files:
        print("FAIL: no fixtures found")
        return 1
    for d in unexpected:
        print(f"FAIL: unexpected directory '{d}' (allowed: {', '.join(GROUPS)})")
        problems += 1
    for group, path in files:
        errors, fid = validate_file(path, group, seen)
        rel = os.path.relpath(path, HERE)
        if errors:
            problems += 1
            print(f"  FAIL {rel}")
            for err in errors:
                print(f"       - {err}")
        else:
            print(f"  OK   {rel} ({fid})")
    by_group = {g: sum(1 for x, _ in files if x == g) for g in GROUPS}
    print(f"Fixtures: {len(files)} ({', '.join(f'{g}={n}' for g, n in by_group.items())}); "
          f"invalid: {problems}")
    if "--self-test" in sys.argv:
        problems += self_test(files)
    print("RESULT: " + ("PASS" if problems == 0 else "FAIL"))
    return 0 if problems == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
