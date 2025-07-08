import { useRef, useState } from "react";

import PdfViewer, { type ExtractedText, type PdfViewerRef } from "./PdfViewer";
import Menu from "./Menu";

function Grid() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractedTexts, setExtractedTexts] = useState<ExtractedText[]>([]);

  const pdfViewerRef = useRef<PdfViewerRef>(null);

  const handleTextsExtracted = (texts: ExtractedText[]) => {
    setExtractedTexts(texts);
  };

  const handleExtractRequest = () => {
    pdfViewerRef.current?.extractTexts();
  };

  const handleClearRequest = () => {
    pdfViewerRef.current?.clearSelection();
    setExtractedTexts([]);
  };

  return (
    <div className="container text-center">
      <div className="row">
        <div className="col">
          <div className="card mt-5">
            <div className="card-body">
              <h2 className="card-title">Extraia o texto de seus PDFs!</h2>
              <p className="card-text">
                Faça upload do arquivo e selecione a área de texto que quer
                extrair. O texto da área correspondente em cada página será
                exibido abaixo e poderá ser baixado como CSV.
              </p>
              <Menu
                onFileSelect={setSelectedFile}
                extractedTexts={extractedTexts}
                onExtractTexts={handleExtractRequest}
                onClearSelection={handleClearRequest}
              />
            </div>
          </div>
        </div>
        <div className="col">
          <PdfViewer
            ref={pdfViewerRef}
            file={selectedFile}
            onTextsExtracted={handleTextsExtracted}
          />
        </div>
      </div>
    </div>
  );
}

export default Grid;
