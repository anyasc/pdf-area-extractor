import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

import { Document, Page } from "react-pdf";

interface PdfViewerProps {
  file: File | null;
  onTextsExtracted: (texts: ExtractedText[]) => void;
}

// Cria o objeto a ser usado como área de seleção
interface SelectionArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PdfViewerRef {
  extractTexts: () => void;
  clearSelection: () => void;
}

interface ExtractedText {
  pageNumber: number;
  text: string;
}

const PdfViewer = forwardRef<PdfViewerRef, PdfViewerProps>(
  ({ file, onTextsExtracted }, ref) => {
    // constantes para virar páginas
    const [numPages, setNumPages] = useState<number>();
    const [pageNumber, setPageNumber] = useState<number>(1);

    const documentRef = useRef<any>(null);

    //constantes para seleção de área
    const [selectionArea, setSelectionArea] = useState<SelectionArea | null>(
      null
    );
    const [isSelecting, setIsSelecting] = useState<boolean>(false);
    const [startPoint, setStartPoint] = useState<{
      x: number;
      y: number;
    } | null>(null);
    const [currentSelection, setCurrentSelection] =
      useState<SelectionArea | null>(null);

    const pdfRef = useRef<HTMLDivElement>(null); // Usa a div do pdf como referência para a seleção da área

    // Funções de mudar de página
    function changePage(offset: number) {
      setPageNumber((prevPageNumber) => prevPageNumber + offset);
    }
    function previousPage() {
      changePage(-1);
    }
    function nextPage() {
      changePage(1);
    }

    const handleMouseDown = useCallback(
      (e: React.MouseEvent) => {
        if (!pdfRef.current) return;
        if (
          isSelecting &&
          currentSelection &&
          currentSelection.x >= 10 &&
          currentSelection.y >= 10
        ) {
          setSelectionArea(currentSelection);
          setIsSelecting(false);
          setCurrentSelection(null);
        } else if (!isSelecting) {
          const rect = pdfRef.current.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          setSelectionArea(null);
          setStartPoint({ x, y });
          setIsSelecting(true);
          setCurrentSelection(null);
        }
      },
      [isSelecting, currentSelection]
    );

    const handleMouseMove = useCallback(
      (e: React.MouseEvent) => {
        if (!isSelecting || !startPoint || !pdfRef.current) return;

        const rect = pdfRef.current.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;

        const selection: SelectionArea = {
          x: Math.min(startPoint.x, currentX),
          y: Math.min(startPoint.y, currentY),
          width: Math.abs(startPoint.x - currentX),
          height: Math.abs(startPoint.y - currentY),
        };

        setCurrentSelection(selection);
      },
      [isSelecting, startPoint]
    );

    // Extraindo o texto
    const extractText = async () => {
      if (!documentRef.current || !selectionArea || !numPages) return;

      const allStrings: ExtractedText[] = [];
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await documentRef.current.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1 });
        const currentViewport = page.getViewport({
          scale: 600 / viewport.width,
        });

        // Obtendo as coordenadas da área de seleção na escala correta
        const scale = currentViewport.scale;
        const pdfCoords = {
          x: selectionArea.x / scale,
          width: selectionArea.width / scale,
          // inverter Y, pois na seleção o zero está no topo, e no pdf, na base
          y:
            viewport.height -
            selectionArea.y / scale -
            selectionArea.height / scale,
          height: selectionArea.height / scale,
        };

        // Extrair texto de cada página
        const textContent = await page.getTextContent();
        const filteredTextContent = textContent.items.filter(
          (item: {
            str: string;
            height: number;
            width: number;
            transform: any[];
          }) => {
            const textMinX = item.transform[4];
            const textMinY = item.transform[5];
            const textMaxX = item.transform[4] + item.width;
            const textMaxY = item.transform[5] + item.height;
            return (
              textMinX >= pdfCoords.x &&
              textMaxX <= pdfCoords.x + pdfCoords.width &&
              textMinY >= pdfCoords.y &&
              textMaxY <= pdfCoords.y + pdfCoords.height
            );
          }
        );

        const pageText = filteredTextContent
          .map((item: { str: any }) => item.str)
          .join(" ");
        allStrings.push({ pageNumber: pageNum, text: pageText });
      }
      onTextsExtracted(allStrings);
    };

    const clearSelection = () => {
      setSelectionArea(null);
      setCurrentSelection(null);
      setIsSelecting(false);
      setStartPoint(null);
    };

    useImperativeHandle(ref, () => ({
      extractTexts: extractText,
      clearSelection: clearSelection,
    }));

    return !file ? (
      // Mensagem antes de carregar algum pdf
      <>
        <p>Carregue um pdf para ser exibido aqui</p>
      </>
    ) : (
      // Exibindo o pdf
      <>
        <div className="row justify-content-center align-items-center mx-3 mt-2">
          <button
            className="col btn btn-secondary m-1"
            type="button"
            disabled={pageNumber <= 1}
            onClick={previousPage}
          >
            Anterior
          </button>
          <p className="col align-self-bottom mt-2">
            Página {pageNumber || (numPages ? 1 : "--")} de {numPages || "--"}
          </p>
          <button
            className="col btn btn-secondary m-1"
            type="button"
            disabled={pageNumber >= (numPages ?? 0)}
            onClick={nextPage}
          >
            Próxima
          </button>
        </div>
        <div
          ref={pdfRef}
          className="position-relative d-inline-block"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
        >
          <Document
            file={file}
            onLoadSuccess={(pdfDoc) => {
              setNumPages(pdfDoc.numPages);
              setPageNumber(1);
              documentRef.current = pdfDoc;
            }}
          >
            <Page
              pageNumber={pageNumber}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          </Document>
          {selectionArea && (
            <div
              className="position-absolute border border-success"
              style={{
                left: selectionArea.x,
                top: selectionArea.y,
                width: selectionArea.width,
                height: selectionArea.height,
                backgroundColor: "rgba(40, 210, 60, 0.20)",
                zIndex: 10,
              }}
            ></div>
          )}
          {currentSelection && (
            <div
              className="position-absolute border border-secondary"
              style={{
                left: currentSelection.x,
                top: currentSelection.y,
                width: currentSelection.width,
                height: currentSelection.height,
                backgroundColor: "rgba(134, 142, 135, 0.2)",
                zIndex: 10,
              }}
            ></div>
          )}
        </div>
      </>
    );
  }
);

export default PdfViewer;
export type { ExtractedText };
