import React, { useRef, useState } from 'react';
import { Camera, Upload, AlertCircle, Image as ImageIcon, ShieldCheck } from 'lucide-react';

interface ImageReportUploaderProps {
  onImageSelected: (file: File) => void;
  disabled?: boolean;
}

export const ImageReportUploader: React.FC<ImageReportUploaderProps> = ({
  onImageSelected,
  disabled = false,
}) => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

  const validateAndSelectFile = (file: File) => {
    setErrorMsg(null);

    // Validate type
    if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
      setErrorMsg('Unsupported image type. Please select a JPEG, PNG, or WebP photo.');
      return;
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMsg('Image is too large. Maximum allowed file size is 10 MB.');
      return;
    }

    onImageSelected(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSelectFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSelectFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4 shadow-xl">
      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Header */}
      <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
          <Camera className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-100">Add Safety Evidence Photo</h3>
          <p className="text-xs text-slate-400">
            Upload or capture a photo showing road damage, broken lighting, or physical obstruction.
          </p>
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Drag & Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`rounded-2xl border-2 border-dashed p-7 text-center transition-all ${
          isDragOver
            ? 'border-emerald-500 bg-emerald-500/10'
            : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
        }`}
      >
        <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 mb-3">
          <ImageIcon className="w-7 h-7 text-emerald-400" />
        </div>

        <h4 className="text-sm font-bold text-slate-200">Drag &amp; drop your safety photo here</h4>
        <p className="text-xs text-slate-400 mt-1 mb-5">
          Supports JPEG, PNG, WebP up to 10 MB
        </p>

        {/* Buttons: Take Photo & Upload File */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            disabled={disabled}
            onClick={() => cameraInputRef.current?.click()}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50"
          >
            <Camera className="w-4 h-4" />
            <span>Take Photo</span>
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50"
          >
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>Upload from Device</span>
          </button>
        </div>
      </div>

      {/* Privacy Notice Banner */}
      <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-start gap-2.5 text-[11px] text-slate-400">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <span>
          <strong>Privacy Safeguard:</strong> SafeSphere AI analyzes only physical conditions and hazards.
          Never photograph people's faces, private individuals, or personal identification.
        </span>
      </div>
    </div>
  );
};

export default ImageReportUploader;
