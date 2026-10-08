import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LMS | Không gian học tập",
  description: "Hệ thống học tập cho môn Lập trình mạng",
};

/** Layout chung; dùng font hệ thống để build không phụ thuộc tải Google Fonts. */
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body>{children}</body></html>;
}
