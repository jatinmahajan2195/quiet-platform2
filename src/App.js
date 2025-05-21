import React, { useState } from "react";
import { jsPDF } from "jspdf";

/**
 * Product Catalog Builder – UI‑refined version
 * -------------------------------------------------
 * • Segoe UI font, soft gradient background
 * • Center‑aligned cover‑step card with by‑line
 * • Existing PDF logic & Tailwind classes retained
 */
export default function App() {
  /* ----------------------------- state ----------------------------- */
  const [logoDataUrl, setLogoDataUrl] = useState(null);
  const [companyName, setCompanyName] = useState("");
  const [bgRGB, setBgRGB] = useState([242, 242, 242]);
  const [step, setStep] = useState(1);

  const [inputs, setInputs] = useState([
    { name: "", images: [], price: "", description: "" },
  ]);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  /* ------------------------- helpers ------------------------------ */
  const fileToDataUrl = (file) =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = (e) => res(e.target.result);
      r.onerror = rej;
      r.readAsDataURL(file);
    });

  const computeBgFromLogo = (dataUrl) => {
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const size = 40;
      canvas.width = size;
      canvas.height = size;
      ctx.drawImage(img, 0, 0, size, size);
      const { data } = ctx.getImageData(0, 0, size, size);
      let r = 0,
        g = 0,
        b = 0;
      for (let i = 0; i < data.length; i += 4) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
      }
      const pixels = data.length / 4;
      r = Math.round(r / pixels);
      g = Math.round(g / pixels);
      b = Math.round(b / pixels);
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      setBgRGB(brightness > 180 ? [0, 77, 64] : [242, 242, 242]);
    };
  };

  /* ----------------------- event handlers ------------------------- */
  const handleLogoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = await fileToDataUrl(file);
    setLogoDataUrl(url);
    computeBgFromLogo(url);
  };

  const changeInput = (idx, field, value) =>
    setInputs((arr) =>
      arr.map((it, i) => (i === idx ? { ...it, [field]: value } : it))
    );

  const changeFiles = (idx, files) =>
    setInputs((arr) =>
      arr.map((it, i) =>
        i === idx ? { ...it, images: Array.from(files) } : it
      )
    );

  const addBlock = () =>
    setInputs((arr) => [
      ...arr,
      { name: "", images: [], price: "", description: "" },
    ]);

  const submitProducts = async (e) => {
    e.preventDefault();
    setError("");
    setShowSuccess(false);
    const flat = [];
    try {
      for (const p of inputs) {
        if (!p.name.trim() || !p.price.trim() || p.images.length === 0) {
          setError("Each product needs a name, price and at least one image.");
          return;
        }
        for (const img of p.images) {
          const url = await fileToDataUrl(img);
          flat.push({ ...p, img: url });
        }
      }
      setProducts(flat);
      setInputs([{ name: "", images: [], price: "", description: "" }]);
      setShowSuccess(true);
    } catch (err) {
      console.error(err);
      setError("Couldn't read an image – please try different files.");
    }
  };

  const generatePdf = () => {
    if (!logoDataUrl || !companyName.trim())
      return setError("Company logo and name are required.");
    if (products.length === 0) return setError("Add some products first.");

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    const [bgR, bgG, bgB] = bgRGB;

    doc.setFillColor(bgR, bgG, bgB);
    doc.rect(0, 0, w, h, "F");

    const logoMax = w * 0.5;
    const logoX = (w - logoMax) / 2;
    const logoY = (h - logoMax) / 2 - 60;
    doc.addImage(logoDataUrl, "PNG", logoX, logoY, logoMax, logoMax);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(36);
    doc.setTextColor(20, 20, 20);
    doc.text(companyName, w / 2, logoY + logoMax + 60, { align: "center" });

    const cols = 2,
      rows = 2,
      margin = 40,
      cellW = (w - margin * 2) / cols;

    const drawBackground = () => {
      doc.setFillColor(bgR, bgG, bgB);
      doc.rect(0, 0, w, h, "F");
      doc.setDrawColor(200);
      doc.setLineWidth(0.5);
      doc.line(w / 2, margin, w / 2, h - margin);
      doc.line(margin, h / 2, w - margin, h / 2);
    };

    products.forEach((p, idx) => {
      if (idx % 4 === 0) {
        doc.addPage();
        drawBackground();
      }
      const pos = idx % 4;
      const r = Math.floor(pos / 2);
      const c = pos % 2;
      const x = margin + c * cellW;
      const y = margin + r * ((h - margin * 2) / 2);
      const imgSize = cellW * 0.55;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(p.name, x + cellW / 2, y + 14, { align: "center" });

      doc.addImage(
        p.img,
        "JPEG",
        x + (cellW - imgSize) / 2,
        y + 24,
        imgSize,
        imgSize
      );

      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.text(`Price: ₹${p.price}`, x + cellW / 2, y + imgSize + 50, {
        align: "center",
      });

      if (p.description.trim()) {
        doc.setFontSize(10);
        const descLines = doc.splitTextToSize(p.description, cellW - 20);
        doc.text(descLines, x + cellW / 2, y + imgSize + 70, {
          align: "center",
        });
      }
    });

    doc.save("product-catalog.pdf");
  };

  /* --------------------------- render UI ------------------------- */
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{
        fontFamily: "'Segoe UI', sans-serif",
        background: "linear-gradient(135deg,#f5f7fa 0%,#c3cfe2 100%)",
      }}
    >
      <div className="w-full max-w-lg">
        <h1 className="text-4xl font-bold text-center mb-2">
          Product Catalog Builder
        </h1>
        <p className="text-center text-gray-700 mb-8 text-lg">
          Create beautiful, print‑ready catalogs in just a few clicks.
        </p>

        {step === 1 && (
          <div className="bg-white shadow-xl rounded-2xl p-8 space-y-6">
            <div>
              <label className="font-semibold">Company Logo</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="mt-2 block w-full text-sm"
              />
            </div>
            {logoDataUrl && (
              <img
                src={logoDataUrl}
                alt="Logo preview"
                className="max-h-48 object-contain mx-auto"
              />
            )}
            <div>
              <label className="font-semibold">Company Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Your company name"
                className="mt-2 w-full border rounded-lg p-3"
              />
            </div>
            {error && (
              <p className="text-red-600 text-sm text-center">{error}</p>
            )}
            <button
              disabled={!logoDataUrl || !companyName.trim()}
              onClick={() => setStep(2)}
              className="w-full py-3 rounded-xl text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: "#007bff" }}
            >
              Next: Add Products
            </button>
          </div>
        )}

        {step === 2 && (
          <>
            <form
              onSubmit={submitProducts}
              className="bg-white shadow-xl rounded-2xl p-8 space-y-6"
            >
              {inputs.map((inp, idx) => (
                <div
                  key={idx}
                  className="border border-gray-200 rounded-xl p-4 space-y-4"
                >
                  <div>
                    <label className="font-semibold">Product Name</label>
                    <input
                      type="text"
                      value={inp.name}
                      onChange={(e) => changeInput(idx, "name", e.target.value)}
                      className="mt-2 w-full border rounded-lg p-3"
                      placeholder="Product name"
                    />
                  </div>
                  <div>
                    <label className="font-semibold">Product Images</label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => changeFiles(idx, e.target.files)}
                      className="mt-2 block w-full text-sm"
                    />
                  </div>
                  <div>
                    <label className="font-semibold">Price (₹)</label>
                    <input
                      type="text"
                      value={inp.price}
                      onChange={(e) =>
                        changeInput(idx, "price", e.target.value)
                      }
                      className="mt-2 w-full border rounded-lg p-3"
                      placeholder="e.g., 599"
                    />
                  </div>
                  <div>
                    <label className="font-semibold">
                      Description (optional)
                    </label>
                    <textarea
                      rows="2"
                      value={inp.description}
                      onChange={(e) =>
                        changeInput(idx, "description", e.target.value)
                      }
                      className="mt-2 w-full border rounded-lg p-3"
                      placeholder="Short description"
                    />
                  </div>
                </div>
              ))}
              {error && (
                <p className="text-red-600 text-sm text-center -mt-2">
                  {error}
                </p>
              )}
              {showSuccess && (
                <p className="text-green-600 text-sm text-center -mt-2">
                  Products added successfully!
                </p>
              )}
              <div className="flex gap-4 justify-between">
                <button
                  type="button"
                  onClick={addBlock}
                  className="flex-1 bg-gray-200 py-3 rounded-xl hover:bg-gray-300"
                >
                  + Add Another Product
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-3 rounded-xl"
                >
                  Add Products
                </button>
              </div>
            </form>

            {products.length > 0 && (
              <div className="text-center mt-8">
                <button
                  onClick={generatePdf}
                  className="bg-green-600 text-white py-3 px-6 rounded-xl text-lg"
                >
                  Download Catalog PDF
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
