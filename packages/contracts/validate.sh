#!/usr/bin/env bash
# =============================================================================
# validate.sh — P0-SH-02 OpenAPI contract validation
# Location: packages/contracts/validate.sh
#
# Primary: Python 3 + PyYAML (available without network)
# Secondary: redocly / spectral (local pnpm devDependency — pending group approval)
#
# Checks:
#   1. YAML parses successfully
#   2. openapi version is 3.1.x
#   3. Operation count in openapi.yaml = 44
#   4. API Documentation v1.1 endpoint heading count = 44 (counts match)
#   5. Saving Jars has exactly 6 operations
#   6. No PATCH on /saving-jars/{jarId} (D-11)
#   7. No DELETE on /saving-jars/{jarId} (D-11)
#   8. Idempotent-Replayed header is absent
#   9. PATCH /transactions/{transactionId} has receipt contract
#  10. RECEIPT_TOTAL_MISMATCH error code documented
#  11. POST /ai/drafts/{draftId}/confirm has Idempotency-Key (required)
#  12. POST /ai/draft-batches/{batchId}/confirm-all has Idempotency-Key
#  13. POST /ai/receipts/scan has Idempotency-Key
#  14. Soft-delete semantics (D-12a/D-12b) documented
#  15. bearerAuth security scheme defined
#  16. Linter (redocly/spectral) if available
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OPENAPI="$SCRIPT_DIR/openapi.yaml"
# Default: the read-only v1.1 source in docs/sources/. Override with
# API_DOC_PATH only to point at another copy of 05_API_Documentation_v1.1.md.
# If the document cannot be found or its endpoint headings cannot be counted,
# the count-match check FAILS (it is never skipped).
API_DOC="${API_DOC_PATH:-$SCRIPT_DIR/../../docs/sources/05_API_Documentation_v1.1.md}"

echo "======================================================================"
echo "P0-SH-02 OpenAPI Contract Validation"
echo "Contract : $OPENAPI"
echo "API doc  : $API_DOC"
echo "======================================================================"
echo ""

# ------------------------------------------------------------------------------
# Primary: Python-based structural checks (no network required)
# ------------------------------------------------------------------------------
echo "── Python structural checks ──────────────────────────────────────────"

# Capture the Python exit code instead of letting `set -e` abort the script,
# so the SUMMARY below is always printed and the final exit code reflects it.
set +e
python3 - "$OPENAPI" "$API_DOC" <<'PYEOF'
import sys, re, os

openapi_path = sys.argv[1]
api_doc_path = sys.argv[2]

try:
    import yaml
except ImportError:
    print("  ⚠️  PyYAML not installed. Run: pip install pyyaml --break-system-packages")
    sys.exit(1)

PASS, FAIL = [], []

with open(openapi_path) as f:
    raw = f.read()

try:
    doc = yaml.safe_load(raw)
    PASS.append("YAML parses successfully")
except yaml.YAMLError as e:
    print(f"  ❌  YAML parse error: {e}")
    sys.exit(1)

if doc.get("openapi", "").startswith("3.1"):
    PASS.append(f"openapi version: {doc['openapi']}")
else:
    FAIL.append(f"Expected openapi 3.1.x, got: {doc.get('openapi')}")

paths = doc.get("paths", {})
HTTP_METHODS = {"get","post","put","patch","delete","head","options","trace"}
total_ops = jar_ops = 0
jar_has_patch = jar_has_delete = False

for path, path_item in paths.items():
    if not path_item:
        continue
    for method, op in path_item.items():
        if method.lower() in HTTP_METHODS:
            total_ops += 1
            if "/saving-jars" in path:
                jar_ops += 1
                if method.lower() == "patch":
                    jar_has_patch = True
                if method.lower() == "delete":
                    jar_has_delete = True

print(f"   Total operations: {total_ops}")
(PASS if total_ops == 44 else FAIL).append(
    f"Operation count = 44" if total_ops == 44
    else f"Operation count: expected 44, got {total_ops}")

if not os.path.isfile(api_doc_path):
    print(f"   API doc not found at {api_doc_path}")
    FAIL.append(f"API doc not found at {api_doc_path} — endpoint count not compared")
else:
    try:
        with open(api_doc_path, encoding="utf-8") as f:
            api_text = f.read()
    except (OSError, UnicodeDecodeError) as e:
        api_text = None
        print(f"   API doc could not be read: {e}")
        FAIL.append(f"API doc could not be read ({api_doc_path}) — endpoint count not compared")
    if api_text is not None:
        api_count = len(re.findall(
            r'^### (GET|POST|PATCH|PUT|DELETE|HEAD|OPTIONS) `', api_text, re.MULTILINE))
        print(f"   API doc headings: {api_count}")
        if api_count == 0:
            FAIL.append(f"API doc endpoint headings not found in {api_doc_path} — count not compared")
        else:
            (PASS if total_ops == api_count else FAIL).append(
                f"Count match: openapi={total_ops} = API doc={api_count}" if total_ops == api_count
                else f"Count mismatch: openapi={total_ops}, API doc={api_count}")

print(f"   Saving Jars operations: {jar_ops}")
(PASS if jar_ops == 6 else FAIL).append(
    "Saving Jars has exactly 6 operations" if jar_ops == 6
    else f"Saving Jars: expected 6, got {jar_ops}")

(PASS if not jar_has_patch else FAIL).append(
    "No PATCH on saving-jars/{jarId} (D-11)" if not jar_has_patch
    else "PATCH found on saving-jars/{jarId} — violates D-11")
(PASS if not jar_has_delete else FAIL).append(
    "No DELETE on saving-jars/{jarId} (D-11)" if not jar_has_delete
    else "DELETE found on saving-jars/{jarId} — violates D-11")

(PASS if "idempotent-replayed" not in raw.lower() else FAIL).append(
    "Idempotent-Replayed header absent"
    if "idempotent-replayed" not in raw.lower()
    else "Idempotent-Replayed found — must be removed")

patch_tx = paths.get("/transactions/{transactionId}", {})
if "patch" in patch_tx:
    pb = str(patch_tx["patch"])
    (PASS if "receipt" in pb and "merchant_name" in pb else FAIL).append(
        "PATCH /transactions/{transactionId} has receipt contract"
        if "receipt" in pb and "merchant_name" in pb
        else "PATCH /transactions/{transactionId} missing receipt fields")
else:
    FAIL.append("PATCH /transactions/{transactionId} not found")

(PASS if "RECEIPT_TOTAL_MISMATCH" in raw else FAIL).append(
    "RECEIPT_TOTAL_MISMATCH documented"
    if "RECEIPT_TOTAL_MISMATCH" in raw
    else "RECEIPT_TOTAL_MISMATCH missing")

for op_id, path_key, method in [
    ("confirmDraft", "/ai/drafts/{draftId}/confirm", "post"),
    ("confirmAllDrafts", "/ai/draft-batches/{batchId}/confirm-all", "post"),
    ("scanReceipt", "/ai/receipts/scan", "post"),
]:
    op = paths.get(path_key, {}).get(method, {})
    params = str(op.get("parameters", []))
    has_key = "IdempotencyKeyRequired" in params
    (PASS if has_key else FAIL).append(
        f"{op_id} has IdempotencyKeyRequired" if has_key
        else f"{op_id} missing IdempotencyKeyRequired")

(PASS if "deleted_at" in raw and "D-12a" in raw else FAIL).append(
    "Soft-delete semantics (D-12a/D-12b) documented"
    if "deleted_at" in raw and "D-12a" in raw
    else "Soft-delete documentation missing")

sec = doc.get("components", {}).get("securitySchemes", {})
(PASS if "bearerAuth" in sec else FAIL).append(
    "bearerAuth security scheme defined"
    if "bearerAuth" in sec
    else "bearerAuth security scheme missing")

print()
print("=" * 62)
print(f"Python checks: {len(PASS)} passed, {len(FAIL)} failed")
print("=" * 62)
for p in PASS:
    print(f"  ✅  {p}")
for f in FAIL:
    print(f"  ❌  {f}")

sys.exit(0 if not FAIL else 1)
PYEOF
PYTHON_EXIT=$?
set -e

echo ""

# ------------------------------------------------------------------------------
# Secondary: OpenAPI linter (local pnpm devDependency — pending group approval)
# ------------------------------------------------------------------------------
echo "── OpenAPI linter ───────────────────────────────────────────────────"
LINT_STATUS="skipped"
if command -v redocly &>/dev/null; then
    if redocly lint "$OPENAPI" --format summary; then
        echo "  ✅  redocly lint passed"
        LINT_STATUS="passed"
    else
        echo "  ❌  redocly lint reported errors"
        LINT_STATUS="failed"
    fi
elif command -v spectral &>/dev/null; then
    if spectral lint "$OPENAPI"; then
        echo "  ✅  spectral lint passed"
        LINT_STATUS="passed"
    else
        echo "  ❌  spectral lint reported errors"
        LINT_STATUS="failed"
    fi
else
    echo "  ⚠️   No OpenAPI linter found on PATH. Lint check skipped."
    echo "  ⚠️   Linter integration (@redocly/cli, local pnpm devDependency) is pending"
    echo "       group approval (Q3, docs/decisions.md §3)."
fi

echo ""
echo "======================================================================"
echo "SUMMARY"
echo "  Python structural checks : $([ $PYTHON_EXIT -eq 0 ] && echo 'PASSED' || echo 'FAILED')"
echo "  OpenAPI linter           : $LINT_STATUS"
echo "======================================================================"

# Fail overall if Python checks fail or linter explicitly failed
if [[ "$PYTHON_EXIT" -ne 0 ]] || [[ "$LINT_STATUS" == "failed" ]]; then
    exit 1
fi
exit 0
