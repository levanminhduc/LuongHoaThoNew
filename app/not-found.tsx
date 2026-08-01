import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileQuestion, Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <FileQuestion className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl tracking-tight">
            Không tìm thấy trang
          </CardTitle>
          <CardDescription className="leading-relaxed">
            Đường dẫn bạn truy cập không tồn tại hoặc đã được thay đổi.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button asChild variant="gradientBlue" className="w-full">
            <Link href="/">
              <Home data-icon="inline-start" className="h-4 w-4" />
              Về Trang Chủ
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/employee/lookup">
              <Search data-icon="inline-start" className="h-4 w-4" />
              Tra Cứu Lương
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
