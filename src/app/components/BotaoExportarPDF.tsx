"use client";

import { useState, useEffect } from "react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { Download } from "lucide-react";

interface BotaoExportarPDFProps {
  document: React.ReactElement<any, string | React.JSXElementConstructor<any>>;
  fileName: string;
  disabled?: boolean;
  className?: string;
}

export function BotaoExportarPDF({
  document,
  fileName,
  disabled = false,
  className,
}: BotaoExportarPDFProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const baseStyle =
    className ||
    "bg-green-600 text-white px-5 py-2.5 rounded-lg font-black text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2 shadow-sm h-10 min-w-[150px] whitespace-nowrap";

  if (!isClient || disabled) {
    return (
      <button
        disabled
        className={`${baseStyle} ${disabled ? "disabled:bg-gray-400 opacity-60 cursor-not-allowed" : ""}`}
      >
        <span className="flex items-center gap-2">
          <Download className="w-4 h-4 inline-block -mt-1" />
          <span className="hidden sm:inline">BAIXAR PDF</span>
          <span className="sm:hidden">PDF</span>
        </span>
      </button>
    );
  }

  return (
    <PDFDownloadLink
      document={document}
      fileName={fileName}
      className={`${baseStyle} hover:bg-green-500`}
    >
      {({ loading }) =>
        loading ? (
          <span className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span className="hidden sm:inline">GERANDO...</span>
            <span className="sm:hidden">GERANDO...</span>
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Download className="w-4 h-4 inline-block -mt-1" />
            <span className="hidden sm:inline">BAIXAR PDF</span>
            <span className="sm:hidden">PDF</span>
          </span>
        )
      }
    </PDFDownloadLink>
  );
}
