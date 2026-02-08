export interface BaseResponseDto {
    success: boolean;
    status: number;
}

export interface BaseResponseDtoWithData<T> extends BaseResponseDto {
    data: T;
}

export interface BaseResponseDtoWithErrors extends BaseResponseDto {
    errors: string[];
}