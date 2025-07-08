import ExtractedTextsBox from "./ExtractedTextsBox";
import type { ExtractedText } from "./PdfViewer";
import UploadFile from "./UploadFile";

interface MenuProps {
  onFileSelect: (file: File) => void;
  onExtractTexts: () => void;
  onClearSelection: () => void;
  extractedTexts: ExtractedText[];
}

function Menu({
  onFileSelect,
  onClearSelection,
  onExtractTexts,
  extractedTexts,
}: MenuProps) {
  return (
    <>
      <UploadFile onFileSelect={onFileSelect} />
      <button
        className="btn btn-outline-warning m-2"
        onClick={onClearSelection}
      >
        Desfazer seleção
      </button>
      <button className="btn btn-outline-success m-2" onClick={onExtractTexts}>
        Extrair textos
      </button>
      <ExtractedTextsBox extractedTexts={extractedTexts} />
    </>
  );
}

export default Menu;
