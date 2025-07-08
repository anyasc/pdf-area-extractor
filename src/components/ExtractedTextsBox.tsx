import { CSVLink } from "react-csv";
import type { ExtractedText } from "./PdfViewer";

interface ExtractedTextsBoxProps {
  extractedTexts: ExtractedText[];
}

function ExtractedTextsBox({ extractedTexts }: ExtractedTextsBoxProps) {
  return extractedTexts.length === 0 ? (
    <div className="border mt-2">
      <p className="text-muted m-4">O texto extraído será exibido aqui</p>
    </div>
  ) : (
    <>
      <div
        style={{ maxHeight: "50vh", overflowY: "auto" }}
        className="border mt-2"
      >
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Página</th>
              <th scope="col">Texto</th>
            </tr>
          </thead>
          <tbody>
            {extractedTexts.map((item) => (
              <tr key={item.pageNumber}>
                <th scope="row">{item.pageNumber}</th>
                <td>{item.text}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <CSVLink
        data={extractedTexts}
        filename="textos-extraidos.csv"
        className="btn btn-outline-success m-3"
      >
        Download CSV
      </CSVLink>
    </>
  );
}

export default ExtractedTextsBox;
