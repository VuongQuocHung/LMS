/** Logo chữ dùng chung cho trang đăng nhập và đầu trang hệ thống. */
export default function PortalBrand() {
  return (
    <div className="portal-brand">
      <span className="portal-mark" aria-hidden="true">LMS</span>
      <div className="portal-brand-text">
        <span>HỆ THỐNG QUẢN LÝ HỌC TẬP</span>
        <strong>KHOA CÔNG NGHỆ THÔNG TIN</strong>
        <small>Learning Management System</small>
      </div>
    </div>
  );
}
