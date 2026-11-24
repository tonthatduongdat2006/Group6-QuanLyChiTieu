import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'isPublic';
/** Đánh dấu endpoint không cần Bearer (chỉ auth/* và health). Mặc định MỌI endpoint đều cần đăng nhập. */
export const Public = () => SetMetadata(IS_PUBLIC, true);
