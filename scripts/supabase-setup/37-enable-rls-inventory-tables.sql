-- SCRIPT 37: BẬT RLS CHO 12 BẢNG KHO/CHỈ TRONG DB luong-nhan-vien
--
-- Các bảng này KHÔNG được code app lương sử dụng. Hiện chúng tắt RLS nên ai có anon key
-- đều đọc/sửa/xóa được qua REST API. Supabase coi anon key là khóa công khai, nên không
-- được dựa vào việc giấu nó để bảo vệ dữ liệu.
--
-- TRƯỚC KHI CHẠY: xác nhận không còn app nào khác (vd. app đặt chỉ) đọc/ghi các bảng này
-- bằng anon key. Nếu có, app đó sẽ bị chặn sau khi chạy -> chuyển app đó sang service_role
-- hoặc viết policy phù hợp. Nếu các bảng không còn dùng, cân nhắc DROP thay vì chỉ bật RLS.
--
-- Xem nhanh bảng nào còn dữ liệu / được ghi gần đây:
SELECT relname, n_live_tup, last_autoanalyze, n_tup_ins, n_tup_upd, n_tup_del
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND relname IN ('loai_chi', 'mau_chi', 'mau_chi_nha_cung_cap', 'nha_cung_cap_chi',
                  'dat_chi', 'dat_thung', 'loai_thung', 'kho_chi', 'lich_su_xuat_nhap_kho',
                  'khach_hang', 'don_hang_po', 'dinh_muc_chi')
ORDER BY relname;

BEGIN;

ALTER TABLE IF EXISTS public.loai_chi              ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.mau_chi               ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.mau_chi_nha_cung_cap  ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.nha_cung_cap_chi      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.dat_chi               ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.dat_thung             ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.loai_thung            ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.kho_chi               ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.lich_su_xuat_nhap_kho ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.khach_hang            ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.don_hang_po           ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.dinh_muc_chi          ENABLE ROW LEVEL SECURITY;

COMMIT;

-- Kiểm tra: kết quả phải rỗng
SELECT c.relname
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity
ORDER BY 1;
