"use client";

import React, { useState, useEffect } from 'react';
import { MAINTENANCE_MESSAGE } from "@/lib/maintenance";
import { Cog, RefreshCw, Server, AlertCircle } from 'lucide-react';

const HEADING_TEXT = "Tra Cứu và Ký Xác Nhận Lương";

export default function MaintenancePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-blue-600 to-blue-800 font-sans text-white">

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 h-96 w-96 rounded-full bg-blue-500/30 blur-3xl animate-pulse" />
        <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-blue-900/40 blur-3xl animate-pulse delay-1000" />

        <div className="absolute top-[20%] left-[15%] h-12 w-12 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm animate-[spin_10s_linear_infinite]" />
        <div className="absolute top-[60%] right-[15%] h-16 w-16 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm animate-[bounce_8s_infinite]" />
        <div className="absolute bottom-[20%] left-[30%] h-8 w-8 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm animate-[pulse_4s_infinite]" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center p-6 text-center">

        <div className={`
          w-full max-w-lg transform rounded-2xl bg-white p-8 shadow-2xl transition-all duration-1000 ease-out
          ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}
        `}>

          <div className="relative mx-auto mb-8 flex h-24 w-24 items-center justify-center">
            <div className="absolute inset-0 animate-[spin_10s_linear_infinite]">
              <Cog className="h-24 w-24 text-blue-100" strokeWidth={1} />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative h-12 w-12 rounded-full bg-blue-50 shadow-inner flex items-center justify-center animate-pulse">
                <Server className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="absolute top-0 right-2 h-4 w-4 rounded-full bg-orange-400 border-2 border-white animate-ping" />
            <div className="absolute top-0 right-2 h-4 w-4 rounded-full bg-orange-400 border-2 border-white" />
          </div>

          <h1 className="mb-3 text-2xl font-bold text-slate-800 sm:text-3xl">
            {HEADING_TEXT}
          </h1>

          <p className="mb-6 text-slate-500 dark:text-gray-400">
            {MAINTENANCE_MESSAGE}
          </p>

          <div className="mb-6 w-full rounded-full bg-slate-100 p-1">
            <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm border border-slate-100">
              <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
              <span className="text-sm font-medium text-blue-700">Đang cập nhật dữ liệu...</span>
              {/* <span className="ml-auto text-xs text-slate-400">75%</span> */}
            </div>
            {/* <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-slate-200">
              <div className="h-full w-3/4 animate-[shimmer_2s_infinite] bg-gradient-to-r from-blue-500 to-blue-400 w-[75%]" />
            </div> */}
          </div>


        </div>

        <p className="mt-8 text-xs font-medium text-blue-200 opacity-80">
          &copy; Hệ thống tra cứu và ký xác nhận lương{" "}
          <strong>Công Ty May Hòa Thọ Điện Bàn</strong>
        </p>

      </div>
    </div>
  );
}
