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

// Objeto de seleção de área retangular
interface SelectionArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Referências para chamar funções a partir de outros componentes
export interface PdfViewerRef {
  extractTexts: () => void;
  clearSelection: () => void;
}

// Objeto de texto extraído por página
interface ExtractedText {
  pageNumber: number;
  text: string;
}

const PdfViewer = forwardRef<PdfViewerRef, PdfViewerProps>(
  ({ file, onTextsExtracted }, ref) => {
    const documentRef = useRef<any>(null);

    // constantes para virar páginas
    const [numPages, setNumPages] = useState<number>();
    const [pageNumber, setPageNumber] = useState<number>(1);

    // Constantes para seleção de área
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

    const pdfRef = useRef<HTMLDivElement>(null);

    // Conjunto de funções para virar a página
    function changePage(offset: number) {
      setPageNumber((prevPageNumber) => prevPageNumber + offset);
    }
    function previousPage() {
      changePage(-1);
    }
    function nextPage() {
      changePage(1);
    }

    /**
     * Funções para seleção de área
     * - Primeiro clique inicia a seleção
     * - Mover o mouse altera a área sendo selecionada
     * - Clicar novamente completa a seleção
     */
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

    /**
     * Função para extrair o texto na área de seleção
     * - Loop que repete em cada página
     * - Considera questões de escala e posição do pdf e área de seleção
     * - Objetos com número da página e string são organizados em uma array
     */
    const extractText = async () => {
      // Early return em caso de dados ausentes
      if (!documentRef.current || !selectionArea || !numPages) return;

      const allStrings: ExtractedText[] = [];

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await documentRef.current.getPage(pageNum);

        // Encontrando a escala em que o pdf foi renderizado
        const originalViewport = page.getViewport({ scale: 1 });
        const renderedWidth =
          pdfRef.current
            ?.querySelector(".react-pdf__Page")
            ?.getBoundingClientRect().width || 600;
        const renderedScale = renderedWidth / originalViewport.width;

        //Convertendo coordenadas da seleção para coordenadas do pdf original, considerando escala
        const pdfCoords = {
          x: selectionArea.x / renderedScale,
          width: selectionArea.width / renderedScale,
          //Y invertido: página = origem no topo, PDF = origem na base
          y:
            originalViewport.height -
            selectionArea.y / renderedScale -
            selectionArea.height / renderedScale,
          height: selectionArea.height / renderedScale,
        };

        // Extrair textos da página e filtrar pela áre selecionada
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

        // Combinação do texto em string única por página
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
        <div className="row">
          <div
            className="col-12 d-flex justify-content-center align-items-center"
            style={{ minHeight: "50vh" }}
          >
            <p className="text-muted">Carregue um pdf para ser exibido aqui</p>
          </div>
        </div>
      </>
    ) : (
      // Exibindo o pdf
      <>
        {/* Menu de virar as páginas */}
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
          style={{
            cursor: "crosshair", // ← Sempre crosshair, removendo a condição
            userSelect: "none",
          }}
        >
          {/* Documento */}
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
          {/* Div para exibir área de seleção concluída */}
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
          {/* Div para exibir área sendo selecionada */}
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

export type { ExtractedText };
export default PdfViewer;
