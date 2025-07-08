import { type ChangeEvent } from "react";

interface UploadFileProps {
  onFileSelect: (file: File) => void;
}

function UploadFile({ onFileSelect }: UploadFileProps) {
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onFileSelect(e.target.files[0]);
    }
  };
  return (
    <div>
      <input
        className="form-control mb-2"
        type="file"
        id="pdf-file"
        name="pdf-file"
        accept=".pdf"
        onChange={handleFileChange}
      />
    </div>
  );
}

export default UploadFile;
