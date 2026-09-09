# Nguồn đối chiếu tự host — 20/08/2026

## Google Cloud

- [Cloud Run pricing](https://cloud.google.com/run/pricing): request-based billing có 2 triệu request, 180.000 vCPU-seconds và 360.000 GiB-seconds miễn phí mỗi tháng; mức giá mặc định công bố là 0,000024 USD/vCPU-second, 0,0000025 USD/GiB-second và 0,40 USD/triệu request ngoài hạn mức.
- [Google Cloud Free Program](https://docs.cloud.google.com/free/docs/free-cloud-features): yêu cầu tài khoản thanh toán; Free Trial cho khách mới gồm 300 USD trong 90 ngày. Always Free gồm 1 e2-micro tại us-west1/us-central1/us-east1, 30 GB persistent disk, 1 GB egress; Cloud Storage miễn phí 5 GB-tháng ở vùng Mỹ, không phải châu Á.
- [Cloud SQL pricing](https://cloud.google.com/sql/pricing): MySQL shared-core db-f1-micro 0,0105 USD/giờ; dedicated Enterprise tại us-central1 0,0413 USD/vCPU-giờ và 0,007 USD/GiB-giờ; SSD 0,000232877 USD/GiB-giờ. Cloud SQL chạy liên tục và không phải dịch vụ Always Free dài hạn.
- [Cloud Storage pricing](https://cloud.google.com/storage/pricing): Standard regional công bố 0,000027397 USD/GiB-giờ (xấp xỉ 0,02 USD/GB-tháng) ở nhóm vùng hiển thị; Class A 0,005 USD/1.000 operations, Class B 0,0004 USD/1.000 operations. Chi phí vùng và egress cần kiểm tra lại trong Pricing Calculator trước khi chốt.
- [Cloud Run + Cloud SQL MySQL](https://docs.cloud.google.com/sql/docs/mysql/connect-instance-cloud-run): cần bật billing và các API Cloud Run, Cloud SQL Admin, Artifact Registry/Cloud Build; service account cần Cloud SQL Client và quyền Cloud Storage phù hợp.
- [Cloud Storage XML API interoperability](https://docs.cloud.google.com/storage/docs/interoperability) và [HMAC keys](https://docs.cloud.google.com/storage/docs/authentication/hmackeys): Cloud Storage XML API tương thích một phần S3 khi đổi endpoint sang `https://storage.googleapis.com` và dùng HMAC key. HMAC secret chỉ hiển thị một lần, phải giữ bằng Secret Manager/vault và quay vòng định kỳ.

## Phương án miễn phí hoặc chi phí thấp ngoài Google

- [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/): 10 GB-tháng, 1 triệu Class A, 10 triệu Class B miễn phí; egress trực tiếp miễn phí. Sau mức miễn phí Standard: 0,015 USD/GB-tháng, 4,50 USD/triệu Class A, 0,36 USD/triệu Class B.
- [Supabase pricing](https://supabase.com/pricing): Free có Postgres 500 MB, 1 GB file, 5 GB egress và tạm dừng project sau 1 tuần không hoạt động. Không tương thích trực tiếp MySQL, nên cần chuyển DB/schema; không khuyến nghị làm nơi vận hành hồ sơ chính thức.
- [Render Free](https://render.com/docs/free): web service ngủ sau 15 phút không có traffic, tệp local mất khi redeploy/restart, DB Postgres free hết hạn sau 30 ngày và không có backup. Chỉ phù hợp demo.
- [Oracle Always Free](https://docs.oracle.com/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm): có tới 2 OCPU/12 GB RAM Ampere A1, 200 GB block volume, 20 GB object storage, MySQL HeatWave Always Free 50 GB data + 50 GB backup (tùy năng lực cấp phát/region). Oracle có thể thu hồi VM idle và báo thiếu host capacity; phù hợp thử nghiệm hoặc tổ chức tự vận hành kỹ thuật, không thay thế cam kết vận hành/backup chuyên nghiệp.
