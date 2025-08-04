-- SCRIPT: THÊM CỘT TIEN_TANG_CA_VUOT VÀO BẢNG PAYROLLS
-- Thêm cột tiền tăng ca vượt cho hệ thống lương MAY HÒA THỌ ĐIỆN BÀN

-- Kiểm tra cột đã tồn tại chưa
DO $$
BEGIN
    -- Kiểm tra xem cột đã tồn tại chưa
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'payrolls' 
        AND column_name = 'tien_tang_ca_vuot'
        AND table_schema = 'public'
    ) THEN
        -- Thêm cột mới
        ALTER TABLE public.payrolls 
        ADD COLUMN tien_tang_ca_vuot DECIMAL(15,2) DEFAULT 0;
        
        RAISE NOTICE 'Đã thêm cột tien_tang_ca_vuot vào bảng payrolls';
    ELSE
        RAISE NOTICE 'Cột tien_tang_ca_vuot đã tồn tại trong bảng payrolls';
    END IF;
END $$;

-- Thêm comment cho cột
COMMENT ON COLUMN public.payrolls.tien_tang_ca_vuot IS 'Tiền tăng ca vượt - số tiền tăng ca vượt giờ quy định';

-- Cập nhật RLS policy nếu cần (đảm bảo cột mới được bao gồm trong policies)
-- Kiểm tra và cập nhật policy SELECT
DO $$
BEGIN
    -- Refresh RLS policies để bao gồm cột mới
    -- Policies hiện tại sẽ tự động áp dụng cho cột mới vì dùng SELECT *
    RAISE NOTICE 'RLS policies sẽ tự động áp dụng cho cột mới';
END $$;

-- Kiểm tra kết quả
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns 
WHERE table_name = 'payrolls' 
AND column_name = 'tien_tang_ca_vuot'
AND table_schema = 'public';

-- Test query để verify cột đã được thêm
SELECT 
    'Cột tien_tang_ca_vuot đã được thêm thành công' as status,
    COUNT(*) as total_records,
    COUNT(tien_tang_ca_vuot) as records_with_value,
    AVG(tien_tang_ca_vuot) as average_value
FROM public.payrolls;

-- Hiển thị structure bảng payrolls sau khi thêm cột
SELECT 
    'Cấu trúc bảng payrolls sau khi thêm cột:' as info;

SELECT 
    ordinal_position,
    column_name,
    data_type,
    character_maximum_length,
    numeric_precision,
    numeric_scale,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'payrolls' 
AND table_schema = 'public'
ORDER BY ordinal_position;
