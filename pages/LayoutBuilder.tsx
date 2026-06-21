import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Share2,
  Save,
  Upload,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize,
  RotateCcw,
  Image as ImageIcon,
  FileText,
  Wrench,
  Sparkles,
  X,
  Download,
  Loader2,
} from "lucide-react";
import { Stage, Layer, Image as KonvaImage, Transformer } from "react-konva";
import useImage from "use-image";
import { useData } from "../contexts/DataContext";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../src/services/api";

function hexToCmyk(hex: string): {
  c: number;
  m: number;
  y: number;
  k: number;
} {
  if (!hex) return { c: 0, m: 0, y: 0, k: 0 };
  let h = hex.replace("#", "");
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  const r = parseInt(h.substring(0, 2), 16) / 255 || 0;
  const g = parseInt(h.substring(2, 4), 16) / 255 || 0;
  const b = parseInt(h.substring(4, 6), 16) / 255 || 0;

  const k = 1 - Math.max(r, g, b);
  if (k === 1) {
    return { c: 0, m: 0, y: 0, k: 100 };
  }
  const c = Math.round(((1 - r - k) / (1 - k)) * 100);
  const m = Math.round(((1 - g - k) / (1 - k)) * 100);
  const y = Math.round(((1 - b - k) / (1 - k)) * 100);
  const kPercent = Math.round(k * 100);

  return { c, m, y, k: kPercent };
}

function cmykToHex(c: number, m: number, y: number, k: number): string {
  const cPct = c / 100;
  const mPct = m / 100;
  const yPct = y / 100;
  const kPct = k / 100;

  const r = Math.round(255 * (1 - cPct) * (1 - kPct));
  const g = Math.round(255 * (1 - mPct) * (1 - kPct));
  const b = Math.round(255 * (1 - yPct) * (1 - kPct));

  const rHex = Math.max(0, Math.min(255, r)).toString(16).padStart(2, "0");
  const gHex = Math.max(0, Math.min(255, g)).toString(16).padStart(2, "0");
  const bHex = Math.max(0, Math.min(255, b)).toString(16).padStart(2, "0");

  return `#${rHex}${gHex}${bHex}`;
}

const CollarIcon = ({ collar }: { collar: any }) => {
  const [svgStr, setSvgStr] = useState<string>("");

  useEffect(() => {
    if (!collar.previewSelector || !collar.svgUrl) return;

    // Check if previewSelector is a URL/base64 rather than a selector query
    const isUrl =
      collar.previewSelector.startsWith("data:") ||
      collar.previewSelector.startsWith("http") ||
      collar.previewSelector.includes("/") ||
      collar.previewSelector.includes(".");
    if (isUrl) return;

    const fetchUrl =
      collar.svgUrl.startsWith("data:") || collar.svgUrl.startsWith("/")
        ? collar.svgUrl
        : `/api/proxy-image?url=${encodeURIComponent(collar.svgUrl)}`;

    fetch(fetchUrl)
      .then((res) => res.text())
      .then((text) => {
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(text, "image/svg+xml");
          const svgNode = doc.querySelector("svg");
          if (svgNode) {
            // Inject dynamic stylesheet matching user's selected parts
            const style = doc.createElementNS(
              "http://www.w3.org/2000/svg",
              "style",
            );
            style.textContent = `
              svg * {
                display: none !important;
              }
              svg, svg g, svg defs, ${collar.previewSelector}, ${collar.previewSelector} * {
                display: block !important;
                display: unset !important;
              }
              ${collar.previewSelector}, ${collar.previewSelector} * {
                fill: none !important;
                stroke: currentColor !important;
                stroke-width: 2.5px !important;
              }
            `;
            svgNode.appendChild(style);

            svgNode.removeAttribute("style");
            svgNode.removeAttribute("class");
            svgNode.setAttribute(
              "class",
              "w-full h-full text-zinc-300 group-hover:text-white transition duration-200",
            );
            svgNode.style.color = "currentColor";

            const serializer = new XMLSerializer();
            setSvgStr(serializer.serializeToString(svgNode));
          } else {
            setSvgStr("");
          }
        } catch (e) {
          console.error(e);
          setSvgStr("");
        }
      })
      .catch((err) => {
        console.error(err);
        setSvgStr("");
      });
  }, [collar.svgUrl, collar.previewSelector]);

  // Primary: Custom user uploaded transparent PNG icon
  if (collar.iconUrl) {
    return (
      <img
        src={collar.iconUrl}
        alt={collar.name}
        className="max-w-[85%] max-h-[85%] object-contain select-none pointer-events-none transition duration-200 group-hover:scale-105"
      />
    );
  }

  // Secondary: Custom selector generated vector icon
  if (collar.previewSelector && svgStr) {
    return (
      <div
        className="w-full h-full flex items-center justify-center p-1 shrink-0 select-none pointer-events-none"
        dangerouslySetInnerHTML={{ __html: svgStr }}
      />
    );
  }

  // Tertiary: Fallback to previewSelector if it contains a URL
  if (
    collar.previewSelector &&
    (collar.previewSelector.startsWith("data:") ||
      collar.previewSelector.startsWith("http") ||
      collar.previewSelector.includes("/") ||
      (collar.previewSelector.includes(".") &&
        !collar.previewSelector.startsWith(".")))
  ) {
    return (
      <img
        src={collar.previewSelector}
        alt={collar.name}
        className="max-w-[85%] max-h-[85%] object-contain select-none pointer-events-none transition duration-200 group-hover:scale-105"
      />
    );
  }

  // Quaternary: Fallback to general svg
  return (
    <img
      src={collar.svgUrl}
      alt={collar.name}
      className="max-w-full max-h-full object-contain filter invert opacity-80"
    />
  );
};

interface MockupImage {
  id: string;
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

const URLImage = ({
  imageProps,
  isSelected,
  onSelect,
  onChange,
}: {
  imageProps: MockupImage;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (newProps: MockupImage) => void;
}) => {
  const [img] = useImage(imageProps.url, "anonymous");
  const shapeRef = useRef<any>(null);
  const trRef = useRef<any>(null);

  useEffect(() => {
    if (isSelected) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  return (
    <React.Fragment>
      <KonvaImage
        image={img}
        onClick={onSelect}
        onTap={onSelect}
        ref={shapeRef}
        {...imageProps}
        draggable
        onDragEnd={(e) => {
          onChange({
            ...imageProps,
            x: e.target.x(),
            y: e.target.y(),
          });
        }}
        onTransformEnd={(e) => {
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();

          node.scaleX(1);
          node.scaleY(1);
          onChange({
            ...imageProps,
            x: node.x(),
            y: node.y(),
            width: Math.max(5, node.width() * scaleX),
            height: Math.max(5, node.height() * scaleY),
            rotation: node.rotation(),
          });
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 5 || newBox.height < 5) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </React.Fragment>
  );
};

export default function LayoutBuilder() {
  const {
    mockupBaseUrl,
    mockupBackgroundUrl,
    mockupBaseX,
    mockupBaseY,
    mockupBaseWidth,
    mockupCollars,
    mockupParts,
    loadData,
  } = useData();
  const { role, currentCustomer } = useAuth();

  const [images, setImages] = useState<MockupImage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const isPanningRef = useRef(false);
  const startPanRef = useRef({ x: 0, y: 0 });
  const [localBgUrl, setLocalBgUrl] = useState<string>("");
  const [selectedCollarId, setSelectedCollarId] = useState<string>("");
  const hasInitializedCollarRef = useRef(false);

  // States para salvar arte no Perfil
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [savedArtId, setSavedArtId] = useState<string | null>(null);
  const [savedArtName, setSavedArtName] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(
    null,
  );

  // Carregar arte salva via URL parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const savedId = params.get("saved_id");
    if (savedId) {
      setSavedArtId(savedId);
      api
        .getSavedArt(savedId)
        .then((art: any) => {
          if (art) {
            setSavedArtName(art.name);
            if (art.images) {
              try {
                setImages(JSON.parse(art.images));
              } catch (e) {
                console.error("Erro ao carregar imagens da arte salva", e);
              }
            }
            if (art.local_bg_url) {
              setLocalBgUrl(art.local_bg_url);
            }
            if (art.part_colors) {
              try {
                setPartColors(JSON.parse(art.part_colors));
              } catch (e) {
                console.error("Erro ao carregar cores das partes", e);
              }
            }
            if (art.part_textures) {
              try {
                setPartTextures(JSON.parse(art.part_textures));
              } catch (e) {
                console.error("Erro ao carregar texturas das partes", e);
              }
            }
            if (art.selected_collar_id) {
              setSelectedCollarId(art.selected_collar_id);
              hasInitializedCollarRef.current = true;
            }
            if (art.collar_color) {
              setCollarColor(art.collar_color);
            }
          }
        })
        .catch((err) => {
          console.error("Erro ao carregar arte do perfil", err);
        });
    }
  }, []);

  const handleOpenSaveModal = () => {
    if (!savedArtName) {
      setSavedArtName(
        `Arte Mockup - ${new Date().toLocaleDateString("pt-BR")} ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
      );
    }
    setIsSaveModalOpen(true);
    setSaveSuccessMessage(null);
  };

  const base64ToBlob = (base64Str: string): Blob => {
    const parts = base64Str.split(";base64,");
    if (parts.length !== 2) {
      throw new Error("Not a valid base64 data URL");
    }
    const contentType = parts[0].split(":")[1];
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);
    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }
    return new Blob([uInt8Array], { type: contentType });
  };

  const uploadBase64Image = async (
    base64Str: string,
    defaultName: string,
  ): Promise<string> => {
    if (!base64Str || !base64Str.startsWith("data:image/")) {
      return base64Str;
    }
    try {
      const blob = base64ToBlob(base64Str);
      let ext = "png";
      if (blob.type === "image/jpeg") ext = "jpg";
      else if (blob.type === "image/webp") ext = "webp";
      else if (blob.type === "image/svg+xml") ext = "svg";

      const randomSlug = Math.trunc(Math.random() * 1000000).toString(36);
      const file = new File(
        [blob],
        `${defaultName}-${Date.now()}-${randomSlug}.${ext}`,
        { type: blob.type },
      );
      const res = await api.uploadFile(file);
      return res.url;
    } catch (err: any) {
      console.error("Error uploading base64 back as file:", err);
      return base64Str;
    }
  };

  const handleSaveToProfile = async () => {
    if (role === "guest") return;
    setIsSaving(true);
    setSaveSuccessMessage(null);

    const uploadCache: { [key: string]: Promise<string> | undefined } = {};
    const uploadBase64WithCache = (
      base64Str: string,
      defaultName: string,
    ): Promise<string> => {
      if (!base64Str || !base64Str.startsWith("data:image/")) {
        return Promise.resolve(base64Str);
      }
      if (uploadCache[base64Str]) {
        return uploadCache[base64Str];
      }
      const uploadPromise = uploadBase64Image(base64Str, defaultName);
      uploadCache[base64Str] = uploadPromise;
      return uploadPromise;
    };

    try {
      // Hide active transformer visual borders/handles for a pristine preview URL
      const stage = stageRef.current;
      const currentlySelected = selectedId;
      setSelectedId(null);
      await new Promise((resolve) => setTimeout(resolve, 120));

      let previewUrl = "";
      if (stage) {
        try {
          const dataUrl = stage.toDataURL({
            mimeType: "image/png",
            pixelRatio: 2,
          });
          if (dataUrl && dataUrl !== "data:,") {
            previewUrl = await uploadBase64Image(dataUrl, "preview-layout");
          }
        } catch (previewErr) {
          console.error(
            "Error generating/uploading layout preview:",
            previewErr,
          );
        }
      }

      if (currentlySelected !== null) {
        setSelectedId(currentlySelected);
      }

      // Upload localBgUrl if it exists and is base64
      let uploadedBgUrl = localBgUrl;
      if (localBgUrl && localBgUrl.startsWith("data:image/")) {
        uploadedBgUrl = await uploadBase64WithCache(localBgUrl, "fundo-layout");
      }

      // Upload overlay/uploaded graphic images
      const uploadedImages = await Promise.all(
        images.map(async (img) => {
          if (img.url && img.url.startsWith("data:image/")) {
            const uploadedUrl = await uploadBase64WithCache(
              img.url,
              "overlay-layout",
            );
            return { ...img, url: uploadedUrl };
          }
          return img;
        }),
      );

      // Upload part textures
      const uploadedTextures: { [key: string]: string } = {};
      const textureKeys = Object.keys(partTextures);
      for (const key of textureKeys) {
        const texVal = partTextures[key];
        if (texVal && texVal.startsWith("data:image/")) {
          uploadedTextures[key] = await uploadBase64WithCache(
            texVal,
            `textura-${key}`,
          );
        } else {
          uploadedTextures[key] = texVal;
        }
      }

      const payload = {
        id: savedArtId || undefined,
        name: savedArtName,
        images: uploadedImages,
        localBgUrl: uploadedBgUrl,
        partColors: partColors,
        partTextures: uploadedTextures,
        selectedCollarId: selectedCollarId,
        collarColor: collarColor,
        systemBgUrl: null,
        previewUrl: previewUrl || null,
      };

      const result = await api.saveArt(payload);
      if (result) {
        setSavedArtId(result.id);
        setSaveSuccessMessage(
          "Sua arte de Mockup 2D foi salva com sucesso no seu perfil!",
        );
        setTimeout(() => {
          setIsSaveModalOpen(false);
          setSaveSuccessMessage(null);
        }, 3000);
      }
    } catch (e: any) {
      alert("Erro ao salvar arte: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadUploadedArtsAndColors = async () => {
    if (
      images.length === 0 &&
      Object.keys(partColors).length === 0 &&
      !collarColor
    ) {
      alert("Nenhuma arte ou customização encontrada para baixar.");
      return;
    }

    // 1. Download each uploaded image
    for (let index = 0; index < images.length; index++) {
      const img = images[index];
      const filename = `arte-upload-${index + 1}.png`;
      try {
        if (img.url.startsWith("data:")) {
          const a = document.createElement("a");
          a.href = img.url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } else {
          // Try to fetch to avoid opening a new tab
          const res = await fetch(img.url);
          if (!res.ok) throw new Error("Fetch failed");
          const blob = await res.blob();
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = blobUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(blobUrl);
        }
      } catch (e) {
        console.warn("Fallback direct download for image:", img.url, e);
        const a = document.createElement("a");
        a.href = img.url;
        a.download = filename;
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    }

    // 2. Generate and download TXT color code details
    try {
      let txtContent = "CRAZY ART - CUSTOMIZAÇÃO DE CORES DO LAYOUT\n";
      txtContent += "===============================================\n\n";

      txtContent += "CORES DAS PARTES:\n";
      const keys = Object.keys(partColors);
      if (keys.length > 0) {
        keys.forEach((partId) => {
          txtContent += `- ${partId.toUpperCase()}: ${partColors[partId]}\n`;
        });
      } else {
        txtContent += "(Nenhuma cor de parte alterada)\n";
      }

      txtContent += `\nCOR DA GOLA:\n- GOLA: ${collarColor || "#ffffff"}\n`;

      const blob = new Blob([txtContent], { type: "text/plain;charset=utf-8" });
      const blobUrl = URL.createObjectURL(blob);
      const aTxt = document.createElement("a");
      aTxt.href = blobUrl;
      aTxt.download = "cores-layout.txt";
      document.body.appendChild(aTxt);
      aTxt.click();
      document.body.removeChild(aTxt);
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error("Erro ao baixar cores do layout", e);
    }
  };

  useEffect(() => {
    const collarsList = Array.isArray(mockupCollars) ? mockupCollars : [];
    if (collarsList.length > 0 && !hasInitializedCollarRef.current) {
      setSelectedCollarId(collarsList[0].id);
      hasInitializedCollarRef.current = true;
    }
  }, [mockupCollars]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  const [containerSize, setContainerSize] = useState({
    width: 720,
    height: 720,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);

  const handleShare = async () => {
    const stage = stageRef.current;
    if (!stage) return;

    const currentlySelected = selectedId;
    setSelectedId(null);

    setTimeout(async () => {
      const triggerDownload = (url: string) => {
        const link = document.createElement("a");
        link.download = "mockup2d.png";
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      };

      try {
        const dataUrl = stage.toDataURL({
          mimeType: "image/png",
          pixelRatio: 2,
        });
        if (!dataUrl || dataUrl === "data:,") {
          throw new Error("Falha ao gerar URL de exportação do canvas");
        }

        // Safe synchronous base64 dataURL to Blob conversion - bypassing fetch network restrictions
        const arr = dataUrl.split(",");
        if (arr.length < 2) {
          throw new Error("Formato de URL de dados incorreto.");
        }
        const mimeMatch = arr[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : "image/png";
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const file = new File([blob], "mockup2d.png", { type: "image/png" });

        if (currentlySelected !== null) {
          setSelectedId(currentlySelected);
        }

        if (
          navigator.share &&
          navigator.canShare &&
          navigator.canShare({ files: [file] })
        ) {
          try {
            await navigator.share({
              files: [file],
              title: "Meu Mockup 2D",
              text: "Confira o mockup personalizado que criei!",
            });
          } catch (shareError) {
            console.warn(
              "Share flow rejected or aborted, downloading instead:",
              shareError,
            );
            triggerDownload(dataUrl);
          }
        } else {
          let copiedToClipboard = false;
          if (
            navigator.clipboard &&
            navigator.clipboard.write &&
            typeof ClipboardItem !== "undefined"
          ) {
            try {
              await navigator.clipboard.write([
                new ClipboardItem({ "image/png": blob }),
              ]);
              copiedToClipboard = true;
              alert(
                "Sucesso! Imagem copiada para a área de transferência. Compartilhe onde desejar!",
              );
            } catch (clipErr) {
              console.error("Clipboard copy failed:", clipErr);
            }
          }

          if (!copiedToClipboard) {
            triggerDownload(dataUrl);
            alert("A imagem foi baixada com sucesso!");
          }
        }
      } catch (err) {
        console.error("Error sharing mockup:", err);
        if (currentlySelected !== null) {
          setSelectedId(currentlySelected);
        }
        // Fallback option in case of security exceptions or taint issues
        alert(
          "Não foi possível gerar ou compartilhar a imagem diretamente. Por favor, certifique-se de que todas as imagens adicionadas usam conexões seguras.",
        );
      }
    }, 120);
  };

  // Dynamic SVG parts customisations
  const [svgText, setSvgText] = useState<string>("");
  const [partColors, setPartColors] = useState<Record<string, string>>({});
  const [partTextures, setPartTextures] = useState<Record<string, string>>({});
  const [dynamicMockupUrl, setDynamicMockupUrl] = useState<string>("");

  // Dynamic Gola (collar) customisations
  const [collarColor, setCollarColor] = useState<string>("#ffffff");
  const [collarSvgText, setCollarSvgText] = useState<string>("");
  const [dynamicCollarUrl, setDynamicCollarUrl] = useState<string>("");
  const [showCollarCmyk, setShowCollarCmyk] = useState(false);
  const [showPartCmyk, setShowPartCmyk] = useState(false);

  // PDF integration states
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [pdfPages, setPdfPages] = useState<{ pageNum: number; thumbnail: string }[]>([]);
  const [uploadedPdfRef, setUploadedPdfRef] = useState<{ file: File; pdfInstance: any } | null>(null);

  const [selectedPartSelector, setSelectedPartSelector] =
    useState<string>("group:camisa");

  const getGroupSelectors = (groupKey: string): string[] => {
    const activeParts = Array.isArray(mockupParts) ? mockupParts : [];
    if (groupKey === "group:camisa") {
      return activeParts.map((p) => p.selector);
    }
    if (groupKey === "group:mangas") {
      return activeParts
        .filter((p) => {
          const nameLower = (p.name || "").toLowerCase();
          const selLower = (p.selector || "").toLowerCase();
          return (
            nameLower.includes("manga") ||
            selLower.includes("manga") ||
            nameLower.includes("sleeve") ||
            selLower.includes("sleeve") ||
            nameLower.includes("punho") ||
            selLower.includes("punho") ||
            nameLower.includes("cuff") ||
            selLower.includes("cuff")
          );
        })
        .map((p) => p.selector);
    }
    if (groupKey === "group:frente_costas") {
      return activeParts
        .filter((p) => {
          const nameLower = (p.name || "").toLowerCase();
          const selLower = (p.selector || "").toLowerCase();
          return (
            nameLower.includes("frente") ||
            selLower.includes("frente") ||
            nameLower.includes("costa") ||
            selLower.includes("costa") ||
            nameLower.includes("verso") ||
            selLower.includes("verso") ||
            nameLower.includes("front") ||
            selLower.includes("front") ||
            nameLower.includes("back") ||
            selLower.includes("back")
          );
        })
        .map((p) => p.selector);
    }
    return [];
  };

  useEffect(() => {
    if (loadData) {
      loadData(true);
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        const size = Math.min(width, height) || width || 720;
        setContainerSize({ width: size, height: size });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const currentMockupUrl =
    mockupBaseUrl ||
    "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=1000&auto=format&fit=crop";

  useEffect(() => {
    if (!currentMockupUrl) {
      setSvgText("");
      return;
    }
    const fetchUrl =
      currentMockupUrl.startsWith("data:") || currentMockupUrl.startsWith("/")
        ? currentMockupUrl
        : `/api/proxy-image?url=${encodeURIComponent(currentMockupUrl)}`;

    fetch(fetchUrl)
      .then((res) => {
        if (!res.ok) throw new Error("Não foi possível carregar o arquivo SVG");
        return res.text();
      })
      .then((text) => {
        if (text.includes("<svg")) {
          setSvgText(text);
        } else {
          setSvgText("");
        }
      })
      .catch((err) => {
        console.error("Erro ao buscar base SVG:", err);
        setSvgText("");
      });
  }, [currentMockupUrl]);

  useEffect(() => {
    if (!svgText) {
      setDynamicMockupUrl("");
      return;
    }
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgText, "image/svg+xml");
      const svgEl = doc.querySelector("svg");
      if (!svgEl) {
        setDynamicMockupUrl("");
        return;
      }

      // Add interactive tags indexing (same as AdminMockupSoon.tsx)
      const interactiveTags = [
        "path",
        "polygon",
        "rect",
        "circle",
        "ellipse",
        "g",
      ];
      interactiveTags.forEach((tag) => {
        const elements = doc.querySelectorAll(tag);
        elements.forEach((el, i) => {
          el.setAttribute("data-svg-index", `${tag}-${i}`);
        });
      });

      // Clear or create defs for patterns
      let defsEl = svgEl.querySelector("defs");
      if (!defsEl) {
        defsEl = doc.createElementNS("http://www.w3.org/2000/svg", "defs");
        svgEl.insertBefore(defsEl, svgEl.firstChild);
      }

      // Inject a <style> block inside the SVG to enforce the color overrides using !important
      let styleEl = svgEl.querySelector("style#dynamic-part-styles");
      if (!styleEl) {
        styleEl = doc.createElementNS("http://www.w3.org/2000/svg", "style");
        styleEl.setAttribute("id", "dynamic-part-styles");
        svgEl.appendChild(styleEl);
      }

      const activeParts = Array.isArray(mockupParts) ? mockupParts : [];
      let styleRules = "";

      activeParts.forEach((part) => {
        const selector = part.selector;
        const color = partColors[selector];
        const texture = partTextures[selector];
        const element = svgEl.querySelector(`[data-svg-index="${selector}"]`);

        if (element) {
          const defaultColor = element.getAttribute("fill") || "#ffffff";
          const activeColor = color || defaultColor;

          if (texture) {
            const patternId = `pat-${selector.replace(/[^a-zA-Z0-9-]/g, "")}`;

            // Remove old pattern if exists
            const oldPat = defsEl!.querySelector(`#${patternId}`);
            if (oldPat) oldPat.remove();

            const pattern = doc.createElementNS(
              "http://www.w3.org/2000/svg",
              "pattern",
            );
            pattern.setAttribute("id", patternId);
            pattern.setAttribute("patternUnits", "objectBoundingBox");
            pattern.setAttribute("patternContentUnits", "objectBoundingBox");
            pattern.setAttribute("width", "1");
            pattern.setAttribute("height", "1");

            // Draw a background rect first to maintain correct color underneath transparent cover PNG
            const patternBg = doc.createElementNS(
              "http://www.w3.org/2000/svg",
              "rect",
            );
            patternBg.setAttribute("x", "0");
            patternBg.setAttribute("y", "0");
            patternBg.setAttribute("width", "1");
            patternBg.setAttribute("height", "1");
            patternBg.setAttribute("fill", activeColor);
            pattern.appendChild(patternBg);

            const patternImg = doc.createElementNS(
              "http://www.w3.org/2000/svg",
              "image",
            );
            patternImg.setAttributeNS(
              "http://www.w3.org/1999/xlink",
              "href",
              texture,
            );
            patternImg.setAttribute("x", "0");
            patternImg.setAttribute("y", "0");
            patternImg.setAttribute("width", "1");
            patternImg.setAttribute("height", "1");
            patternImg.setAttribute("preserveAspectRatio", "xMidYMid slice");

            pattern.appendChild(patternImg);
            defsEl!.appendChild(pattern);

            styleRules += `
              [data-svg-index="${selector}"], [data-svg-index="${selector}"] * {
                fill: url(#${patternId}) !important;
                background-color: transparent !important;
              }
            `;
          } else if (color) {
            styleRules += `
              [data-svg-index="${selector}"], [data-svg-index="${selector}"] * {
                fill: ${color} !important;
                background-color: transparent !important;
              }
            `;
          }
        }
      });

      styleEl.textContent = styleRules;

      const serializer = new XMLSerializer();
      const updatedSvgString = serializer.serializeToString(svgEl);

      const encoded = encodeURIComponent(updatedSvgString)
        .replace(/'/g, "%27")
        .replace(/"/g, "%22");
      const dataUrl = `data:image/svg+xml;charset=utf-8,${encoded}`;
      setDynamicMockupUrl(dataUrl);
    } catch (err) {
      console.error("Erro ao gerar dynamic SVG:", err);
    }
  }, [svgText, partColors, partTextures, mockupParts]);

  const collarsList = Array.isArray(mockupCollars) ? mockupCollars : [];
  const activeCollar = collarsList.find((c) => c.id === selectedCollarId);

  // Fetch Gola (collar) base SVG when selected
  useEffect(() => {
    if (!activeCollar?.svgUrl) {
      setCollarSvgText("");
      setDynamicCollarUrl("");
      return;
    }
    const fetchUrl =
      activeCollar.svgUrl.startsWith("data:") ||
      activeCollar.svgUrl.startsWith("/")
        ? activeCollar.svgUrl
        : `/api/proxy-image?url=${encodeURIComponent(activeCollar.svgUrl)}`;

    fetch(fetchUrl)
      .then((res) => {
        if (!res.ok) throw new Error("Não foi possível carregar a gola");
        return res.text();
      })
      .then((text) => {
        if (text.includes("<svg")) {
          setCollarSvgText(text);
        } else {
          setCollarSvgText("");
          setDynamicCollarUrl("");
        }
      })
      .catch((err) => {
        console.error("Erro ao buscar gola SVG:", err);
        setCollarSvgText("");
        setDynamicCollarUrl("");
      });
  }, [activeCollar?.svgUrl]);

  // Dynamic Gola customisation with the selected color
  useEffect(() => {
    if (!collarSvgText) {
      setDynamicCollarUrl("");
      return;
    }
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(collarSvgText, "image/svg+xml");
      const svgEl = doc.querySelector("svg");
      if (!svgEl) {
        setDynamicCollarUrl("");
        return;
      }

      // Inject style block to override colors inside gola SVG
      let styleEl = svgEl.querySelector("style#dynamic-collar-styles");
      if (!styleEl) {
        styleEl = doc.createElementNS("http://www.w3.org/2000/svg", "style");
        styleEl.setAttribute("id", "dynamic-collar-styles");
        svgEl.appendChild(styleEl);
      }

      const styleRules = `
        path, polygon, rect, circle, ellipse, g {
          fill: ${collarColor} !important;
        }
      `;
      styleEl.textContent = styleRules;

      const serializer = new XMLSerializer();
      const updatedSvgString = serializer.serializeToString(svgEl);

      const encoded = encodeURIComponent(updatedSvgString)
        .replace(/'/g, "%27")
        .replace(/"/g, "%22");
      const dataUrl = `data:image/svg+xml;charset=utf-8,${encoded}`;
      setDynamicCollarUrl(dataUrl);
    } catch (err) {
      console.error("Erro ao gerar gola dinâmica:", err);
    }
  }, [collarSvgText, collarColor]);

  const [mockupImg, setMockupImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    const src = dynamicMockupUrl || currentMockupUrl;
    if (!src) {
      setMockupImg(null);
      return;
    }
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    img.onload = () => {
      setMockupImg(img);
    };
  }, [dynamicMockupUrl, currentMockupUrl]);

  const bgUrlToLoad = (() => {
    const src = localBgUrl || mockupBackgroundUrl;
    if (!src) return "";
    if (src.startsWith("data:") || src.startsWith("/")) {
      return src;
    }
    return `/api/proxy-image?url=${encodeURIComponent(src)}`;
  })();

  const [bgImg] = useImage(bgUrlToLoad, "anonymous");
  const [collarImg] = useImage(
    dynamicCollarUrl || activeCollar?.svgUrl || "",
    "anonymous",
  );

  const handleMouseDown = (e: any) => {
    // Button 2 is the right mouse click
    const isRightClick = e.evt.button === 2;
    if (isRightClick) {
      isPanningRef.current = true;
      setIsPanning(true);
      startPanRef.current = {
        x: e.evt.clientX - stagePos.x,
        y: e.evt.clientY - stagePos.y,
      };
      setSelectedId(null);
    } else {
      if (e.target === e.target.getStage()) {
        setSelectedId(null);
      }
    }
  };

  const handleMouseMove = (e: any) => {
    if (!isPanningRef.current) return;
    const newPos = {
      x: e.evt.clientX - startPanRef.current.x,
      y: e.evt.clientY - startPanRef.current.y,
    };
    setStagePos(newPos);
  };

  const handleMouseUp = () => {
    isPanningRef.current = false;
    setIsPanning(false);
  };

  const handleWheel = (e: any) => {
    // Focus the area by preventing regular page scrolling while over the canvas
    e.evt.preventDefault();

    const stage = e.target.getStage();
    const responsiveScale = containerSize.width / 720;
    const oldScale = zoom * responsiveScale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stagePos.x) / oldScale,
      y: (pointer.y - stagePos.y) / oldScale,
    };

    const scaleBy = 1.05;
    let newZoom = e.evt.deltaY < 0 ? zoom * scaleBy : zoom / scaleBy;
    newZoom = Math.max(0.4, Math.min(5, newZoom));

    setZoom(newZoom);

    const newScale = newZoom * responsiveScale;
    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };
    setStagePos(newPos);
  };

  const insertMockImage = (url: string, imgWidth: number, imgHeight: number) => {
    let width = 150;
    let height = 150;
    if (imgWidth > 0 && imgHeight > 0) {
      if (imgWidth > imgHeight) {
        width = 150;
        height = 150 * (imgHeight / imgWidth);
      } else {
        height = 150;
        width = 150 * (imgWidth / imgHeight);
      }
    }
    const newImage: MockupImage = {
      id: Math.random().toString(36).substring(2, 11),
      url,
      x: 100,
      y: 100,
      width,
      height,
      rotation: 0,
    };
    setImages((prev) => [...prev, newImage]);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (
      file.name.toLowerCase().endsWith(".pdf") ||
      file.type === "application/pdf"
    ) {
      try {
        setLoadingPdf(true);
        const pdfjsLib = await import("pdfjs-dist");
        // @ts-ignore
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;

        if (pdf.numPages === 1) {
          const page = await pdf.getPage(1);
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          if (context) {
            await page.render({ canvasContext: context, viewport }).promise;
            const url = canvas.toDataURL("image/png");
            insertMockImage(url, viewport.width, viewport.height);
          }
        } else {
          const pagesData: { pageNum: number; thumbnail: string }[] = [];
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 0.5 });
            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            if (context) {
              await page.render({ canvasContext: context, viewport }).promise;
              const thumbnail = canvas.toDataURL("image/png");
              pagesData.push({ pageNum: i, thumbnail });
            }
          }
          setPdfPages(pagesData);
          setUploadedPdfRef({ file, pdfInstance: pdf });
          setIsPdfModalOpen(true);
        }
      } catch (err) {
        console.error("Error loading PDF:", err);
        alert("Erro ao ler o arquivo PDF.");
      } finally {
        setLoadingPdf(false);
      }
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        const img = new Image();
        img.onload = () => {
          insertMockImage(url, img.width, img.height);
        };
        img.src = url;
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSelectPdfPage = async (pageNum: number) => {
    if (!uploadedPdfRef) return;
    try {
      setLoadingPdf(true);
      const { pdfInstance } = uploadedPdfRef;
      const page = await pdfInstance.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      if (context) {
        await page.render({ canvasContext: context, viewport }).promise;
        const url = canvas.toDataURL("image/png");
        insertMockImage(url, viewport.width, viewport.height);
      }
      setIsPdfModalOpen(false);
      setPdfPages([]);
      setUploadedPdfRef(null);
    } catch (err) {
      console.error("Error rendering PDF page:", err);
      alert("Erro ao carregar a página selecionada.");
    } finally {
      setLoadingPdf(false);
    }
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Minimum size check 200x200
    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        if (img.width < 200 || img.height < 200) {
          alert("A imagem de fundo deve ter no mínimo 200x200 pixels.");
          return;
        }
        setLocalBgUrl(url);
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
    if (bgInputRef.current) bgInputRef.current.value = "";
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setImages((prev) => prev.filter((img) => img.id !== selectedId));
    setSelectedId(null);
  };

  const clearCanvas = () => {
    if (confirm("Limpar todas as imagens?")) {
      setImages([]);
      setSelectedId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col">
      {/* HEADER */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/50 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="p-2 hover:bg-white/10 rounded-lg transition text-zinc-400 hover:text-white"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-lg font-bold tracking-tight">
              Mockup 2D Builder
            </h1>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
              Artes Personalizadas
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenSaveModal}
            disabled={role === "guest"}
            title={
              role === "guest"
                ? "Faça login no site para salvar no seu perfil"
                : "Salvar no seu Perfil"
            }
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-white/10 text-white rounded-lg hover:bg-zinc-800 transition text-sm font-bold shadow-lg disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Save
              size={16}
              className={role !== "guest" ? "text-primary" : "text-zinc-500"}
            />{" "}
            <span className="hidden sm:inline">Salvar no Perfil</span>
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-amber-600 transition text-sm font-bold shadow-lg shadow-primary/20"
          >
            <Share2 size={16} />{" "}
            <span className="hidden sm:inline">Compartilhar</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-row overflow-hidden">
        {/* SIDEBAR CONTROLS */}
        <div className="w-64 lg:w-80 border-r border-white/5 bg-zinc-950 p-6 flex flex-col gap-6 overflow-y-auto shrink-0">
          <div className="border-b border-white/5 pb-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Wrench size={16} className="text-primary" />
              Ferramentas
            </h2>
            <span className="text-[9px] font-mono font-semibold text-primary/80 uppercase tracking-widest mt-1 block">
              Painel Ativo
            </span>
          </div>

          <div>
            <label className="hidden text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-3 block">
              Fundo da Área
            </label>
            <input
              type="file"
              ref={bgInputRef}
              onChange={handleBgUpload}
              accept="image/*.png,image/jpeg"
              className="hidden"
            />
            <button
              onClick={() => bgInputRef.current?.click()}
              className="hidden w-full py-3 bg-zinc-900 border border-white/5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition flex items-center justify-center gap-2 text-xs font-bold"
            >
              <ImageIcon size={14} /> Alterar Fundo
            </button>
            <p className="hidden text-[9px] text-zinc-600 mt-2 text-center">
              Recomendado: PNG/JPG (Mín. 200x200px)
            </p>
          </div>

          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 block">
              Adicionar Estampas
            </label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*,.pdf"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-10 border-2 border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center gap-3 hover:bg-white/5 hover:border-primary/50 transition group cursor-pointer"
            >
              <div className="p-3 bg-zinc-900 rounded-xl group-hover:bg-primary/20 transition">
                <Upload
                  size={24}
                  className="text-zinc-500 group-hover:text-primary transition"
                />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-zinc-300">
                  Carregar Imagem
                </p>
                <p className="text-[10px] text-zinc-600">PNG, JPG, TIFF, PDF</p>
              </div>
            </button>
          </div>

          {selectedId && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-300">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 block">
                Elemento Selecionado
              </label>
              <button
                onClick={deleteSelected}
                className="w-full py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl hover:bg-red-500 hover:text-white transition flex items-center justify-center gap-2 font-bold text-sm"
              >
                <Trash2 size={16} /> Remover Arte
              </button>
            </div>
          )}

          <div className="mt-auto pt-6 border-t border-white/5 space-y-3">
            <button
              onClick={handleDownloadUploadedArtsAndColors}
              className="w-full py-3 bg-[#a855f7] hover:bg-[#9333ea] text-white rounded-xl text-center flex items-center justify-center gap-2 text-xs font-bold transition shadow-lg shadow-purple-500/15"
            >
              <Download size={14} /> Baixar Artes e Cores
            </button>
            <button
              onClick={clearCanvas}
              className="w-full py-2 text-zinc-650 hover:text-zinc-400 transition text-[10px] uppercase font-bold tracking-widest flex items-center justify-center gap-2"
            >
              <RotateCcw size={12} /> Limpar Área de Trabalho
            </button>
          </div>
        </div>

        {/* WORK AREA */}
        <div className="flex-1 bg-black relative flex flex-col overflow-hidden items-center justify-center">
          {/* TOOLBAR */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center bg-zinc-900/80 backdrop-blur-md border border-white/5 rounded-full p-1 shadow-2xl">
            <button
              onClick={() => bgInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-zinc-400 hover:text-white hover:bg-white/10 transition"
              title="Alterar Fundo da Área"
            >
              <ImageIcon size={14} />
              <span>Alterar Fundo</span>
            </button>
            <div className="w-px h-8 bg-white/5 mx-1" />
            <button
              onClick={() => setZoom((z) => Math.max(0.4, z - 0.1))}
              className="p-2 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition"
            >
              <ZoomOut size={18} />
            </button>
            <div className="w-px h-8 bg-white/5 mx-1" />
            <button
              onClick={() => {
                setZoom(1);
                setStagePos({ x: 0, y: 0 });
              }}
              className="px-3 text-xs font-semibold text-zinc-500 hover:text-white transition"
              title="Redefinir visualização"
            >
              Centralizar
            </button>
            <div className="w-px h-8 bg-white/5 mx-1" />
            <button
              onClick={() => setZoom((z) => Math.min(5, z + 0.1))}
              className="p-2 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition"
            >
              <ZoomIn size={18} />
            </button>
            <div className="w-px h-8 bg-white/5 mx-1" />
            <button
              disabled
              className="px-3 py-1 text-xs font-bold text-zinc-500 cursor-not-allowed flex items-center gap-1.5 bg-zinc-950/20 rounded-full"
            >
              <span>Layout Shorts</span>
              <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-mono uppercase tracking-widest">
                Em breve
              </span>
            </button>
          </div>

          {/* CANVAS WRAPPER */}
          <div
            className="flex-1 w-full overflow-hidden flex items-center justify-center p-6 bg-[radial-gradient(#18181b_1px,transparent_1px)] bg-[size:40px_40px]"
            onClick={() => setSelectedId(null)}
            onContextMenu={(e) => {
              e.preventDefault(); // Impede o menu de contexto nativo para permitir arrastar com botão direito
            }}
          >
            <div
              id="mockup-view-frame"
              ref={containerRef}
              className={`bg-[#121215] shadow-[0_0_80px_rgba(0,0,0,0.6)] rounded-3xl overflow-hidden relative border border-white/5 transition-shadow ${isPanning ? "cursor-grabbing" : "cursor-grab"}`}
              style={{
                width: "min(720px, 100%, calc(100vh - 240px))",
                height: "min(720px, 100%, calc(100vh - 240px))",
                aspectRatio: "1 / 1",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <Stage
                ref={stageRef}
                width={containerSize.width}
                height={containerSize.height}
                scaleX={zoom * (containerSize.width / 720)}
                scaleY={zoom * (containerSize.width / 720)}
                x={stagePos.x}
                y={stagePos.y}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
              >
                <Layer>
                  {bgImg && (
                    <KonvaImage
                      image={bgImg}
                      width={720}
                      height={720}
                      listening={false}
                    />
                  )}
                  {mockupImg &&
                    (() => {
                      const w = 720 * ((mockupBaseWidth ?? 100) / 100);
                      const h = mockupImg
                        ? (mockupImg.height / mockupImg.width) * w
                        : 720;
                      const x = 720 * ((mockupBaseX ?? 50) / 100) - w / 2;
                      const y = 720 * ((mockupBaseY ?? 50) / 100) - h / 2;
                      return (
                        <KonvaImage
                          image={mockupImg}
                          width={w}
                          height={h}
                          x={x}
                          y={y}
                          listening={false}
                        />
                      );
                    })()}
                  {collarImg &&
                    activeCollar &&
                    (() => {
                      const scaleF = (mockupBaseWidth ?? 100) / 100;
                      const shirtCenterX = 720 * ((mockupBaseX ?? 50) / 100);
                      const shirtCenterY = 720 * ((mockupBaseY ?? 50) / 100);

                      const designedCenterX =
                        720 * ((activeCollar.x ?? 50) / 100);
                      const designedCenterY =
                        720 * ((activeCollar.y ?? 50) / 100);
                      const designedWidth =
                        720 * ((activeCollar.width ?? 25) / 100);

                      const offsetX = designedCenterX - 360;
                      const offsetY = designedCenterY - 360;

                      const collarW = designedWidth * scaleF;
                      const collarH = collarImg
                        ? (collarImg.height / collarImg.width) * collarW
                        : collarW;

                      const collarCenterX = shirtCenterX + offsetX * scaleF;
                      const collarCenterY = shirtCenterY + offsetY * scaleF;

                      const collarX = collarCenterX - collarW / 2;
                      const collarY = collarCenterY - collarH / 2;

                      return (
                        <KonvaImage
                          image={collarImg}
                          width={collarW}
                          height={collarH}
                          x={collarX}
                          y={collarY}
                          listening={false}
                        />
                      );
                    })()}
                  {images.map((img, i) => (
                    <URLImage
                      key={img.id}
                      imageProps={img}
                      isSelected={img.id === selectedId}
                      onSelect={() => setSelectedId(img.id)}
                      onChange={(newProps) => {
                        const newImages = images.slice();
                        newImages[i] = newProps;
                        setImages(newImages);
                      }}
                    />
                  ))}
                </Layer>
              </Stage>
            </div>
          </div>

          {/* LEGEND / FOOTER */}
          <div className="w-full bg-zinc-950/80 border-t border-white/5 px-6 py-4 flex flex-row items-center justify-between gap-3 select-none">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#a855f7] animate-pulse"></div>
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest font-bold">
                Canal de Impressão Direto
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-medium">
              <span className="text-center sm:text-left">
                Atalhos: Scroll (Zoom) | Botão Direito (Arrastar)
              </span>
              <span className="border-l border-white/10 pl-4">
                Workspace: 720x720px (1:1)
              </span>
            </div>
          </div>
        </div>

        {/* SIDEBAR DIREITA - CUSTOMIZAÇÃO DE MODELAGEM */}
        <div className="flex w-64 lg:w-80 border-l border-white/5 bg-zinc-950 p-6 flex-col gap-6 overflow-y-auto shrink-0 select-none">
          <div className="border-b border-white/5 pb-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Wrench size={16} className="text-primary" />
              Modelagem
            </h2>
            <span className="text-[9px] font-mono font-semibold text-zinc-500 uppercase tracking-widest mt-1 block">
              Ajustes & Componentes
            </span>
          </div>

          {/* Seletor de Gola (Placed ABOVE clothing parts as requested) */}
          <div className="border-b border-white/5 pb-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Gola do Mockup
                </h3>
                <span className="text-[9px] text-zinc-500 font-mono">
                  Personalização do Molde
                </span>
              </div>
              {selectedCollarId && (
                <button
                  onClick={() => setSelectedCollarId("")}
                  className="text-[10px] text-zinc-500 hover:text-white font-medium transition cursor-pointer bg-transparent border-none p-0"
                >
                  Remover Gola
                </button>
              )}
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent snap-x">
              {collarsList.map((collar) => {
                const isSelected = selectedCollarId === collar.id;
                return (
                  <button
                    key={collar.id}
                    onClick={() => setSelectedCollarId(collar.id)}
                    className={`w-20 shrink-0 p-2 rounded-xl border text-left transition duration-200 flex flex-col gap-1.5 relative group overflow-hidden cursor-pointer snap-start ${
                      isSelected
                        ? "bg-primary/10 border-primary text-white shadow-lg shadow-primary/5"
                        : "bg-[#121215]/40 border-white/5 hover:border-white/10 hover:bg-[#121215]/80 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <div className="aspect-square w-full flex items-center justify-center relative transition">
                      {/* Custom SVG selector icon replacing full image square preview if defined */}
                      <CollarIcon collar={collar} />
                      {isSelected && (
                        <div className="absolute top-0.5 right-0.5 bg-primary text-white text-[7px] font-bold px-1 py-0.2 rounded-full">
                          ON
                        </div>
                      )}
                    </div>
                    <div className="truncate text-[10px] font-bold self-center w-full text-center text-zinc-300">
                      {collar.name}
                    </div>
                  </button>
                );
              })}
              {collarsList.length === 0 && (
                <div className="w-full text-center py-4 border border-dashed border-zinc-800 rounded-xl bg-zinc-950/40">
                  <p className="text-[10px] text-zinc-500 italic">
                    Nenhuma gola cadastrada.
                  </p>
                </div>
              )}
            </div>

            {/* Selector de Cor da Gola com CMYK */}
            {activeCollar && (
              <div className="p-3 bg-zinc-900 border border-white/5 rounded-xl hover:border-white/10 transition space-y-3 mt-2">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[11px] font-bold text-zinc-200 truncate">
                      Cor da Gola
                    </span>
                    <span className="text-[8px] font-mono text-zinc-500 uppercase truncate">
                      {activeCollar.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div
                      className="relative w-6 h-6 rounded-md overflow-hidden border border-white/10 bg-zinc-950 flex items-center justify-center cursor-pointer hover:border-white/30 transition-all duration-200"
                      onClick={() => setShowCollarCmyk((prev) => !prev)}
                      title="Gola CMYK (Clique para abrir ajuste)"
                    >
                      <input
                        type="color"
                        value={collarColor}
                        onChange={(e) => {
                          setCollarColor(e.target.value);
                        }}
                        className="hidden"
                      />
                      <div
                        className="absolute inset-0.5 rounded pointer-events-none"
                        style={{ backgroundColor: collarColor }}
                      ></div>
                    </div>

                    {collarColor !== "#ffffff" && (
                      <button
                        type="button"
                        title="Limpar cor gola"
                        onClick={() => {
                          setCollarColor("#ffffff");
                        }}
                        className="w-6 h-6 flex items-center justify-center rounded-md border border-red-500/10 bg-red-500/5 hover:bg-red-500/20 text-red-400 transition cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* CMYK Panel for Collar Color */}
                {showCollarCmyk && (() => {
                  const { c, m, y, k } = hexToCmyk(collarColor);
                  const updateSingleCollarCmyk = (
                    key: "c" | "m" | "y" | "k",
                    val: number,
                  ) => {
                    const safeVal = Math.max(
                      0,
                      Math.min(100, isNaN(val) ? 0 : val),
                    );
                    const newCmyk = { c, m, y, k };
                    newCmyk[key] = safeVal;
                    setCollarColor(
                      cmykToHex(newCmyk.c, newCmyk.m, newCmyk.y, newCmyk.k),
                    );
                  };
                  return (
                    <div className="space-y-2 bg-zinc-950/40 p-2.5 rounded-lg border border-white/5">
                      <div className="flex justify-between text-zinc-400 font-bold uppercase tracking-wider text-[8px] mb-1 font-mono">
                        <span>Ajuste CMYK</span>
                        <span className="text-zinc-500 font-normal">
                          {collarColor.toUpperCase()}
                        </span>
                      </div>

                      {/* CYAN */}
                      <div className="flex items-center gap-2">
                        <span className="text-cyan-400 font-mono text-[10px] w-3 font-bold text-center">
                          C
                        </span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={c}
                          onChange={(e) =>
                            updateSingleCollarCmyk("c", parseInt(e.target.value))
                          }
                          className="flex-1 h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-cyan-400"
                        />
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={c}
                          onChange={(e) =>
                            updateSingleCollarCmyk("c", parseInt(e.target.value))
                          }
                          className="bg-zinc-900 border border-white/5 rounded px-1.5 py-0.5 text-center text-white text-[9px] w-9 font-mono"
                        />
                        <span className="text-zinc-500 text-[8px] w-2">%</span>
                      </div>

                      {/* MAGENTA */}
                      <div className="flex items-center gap-2">
                        <span
                          className="font-mono text-[10px] w-3 font-bold text-center"
                          style={{ color: "#ec4899" }}
                        >
                          M
                        </span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={m}
                          onChange={(e) =>
                            updateSingleCollarCmyk("m", parseInt(e.target.value))
                          }
                          className="flex-1 h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-pink-500"
                        />
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={m}
                          onChange={(e) =>
                            updateSingleCollarCmyk("m", parseInt(e.target.value))
                          }
                          className="bg-zinc-900 border border-white/5 rounded px-1.5 py-0.5 text-center text-white text-[9px] w-9 font-mono"
                        />
                        <span className="text-zinc-500 text-[8px] w-2">%</span>
                      </div>

                      {/* YELLOW */}
                      <div className="flex items-center gap-2">
                        <span className="text-yellow-400 font-mono text-[10px] w-3 font-bold text-center">
                          Y
                        </span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={y}
                          onChange={(e) =>
                            updateSingleCollarCmyk("y", parseInt(e.target.value))
                          }
                          className="flex-1 h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-yellow-400"
                        />
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={y}
                          onChange={(e) =>
                            updateSingleCollarCmyk("y", parseInt(e.target.value))
                          }
                          className="bg-zinc-900 border border-white/5 rounded px-1.5 py-0.5 text-center text-white text-[9px] w-9 font-mono"
                        />
                        <span className="text-zinc-500 text-[8px] w-2">%</span>
                      </div>

                      {/* BLACK */}
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-300 font-mono text-[10px] w-3 font-bold text-center">
                          K
                        </span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={k}
                          onChange={(e) =>
                            updateSingleCollarCmyk("k", parseInt(e.target.value))
                          }
                          className="flex-1 h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-zinc-300"
                        />
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={k}
                          onChange={(e) =>
                            updateSingleCollarCmyk("k", parseInt(e.target.value))
                          }
                          className="bg-zinc-900 border border-white/5 rounded px-1.5 py-0.5 text-center text-white text-[9px] w-9 font-mono"
                        />
                        <span className="text-zinc-500 text-[8px] w-2">%</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Partes Mapeadas do SVG (Modelagem) */}
          <div className="pb-4 space-y-3">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Partes do Vestuário
              </h3>
              <span className="text-[9px] text-zinc-500 font-mono">
                Personalização de Cores & Matrizes
              </span>
            </div>

            <div className="space-y-4 pr-1">
              <div className="relative">
                <select
                  value={selectedPartSelector}
                  onChange={(e) => setSelectedPartSelector(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-primary font-bold cursor-pointer"
                >
                  <option value="">-- Selecione uma parte --</option>

                  {/* Group options */}
                  <optgroup label="Ações Rápidas (Grupos)">
                    <option value="group:camisa">
                      👕 Camisa Inteira (Geral)
                    </option>
                    <option value="group:mangas">🦾 Todas as Mangas</option>
                    <option value="group:frente_costas">
                      🔄 Frente e Costas
                    </option>
                  </optgroup>

                  {/* Individual parts */}
                  <optgroup label="Partes Individuais">
                    {mockupParts &&
                      mockupParts.map((part: any) => (
                        <option key={part.id} value={part.selector}>
                          {part.name}
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>

              {selectedPartSelector &&
                (() => {
                  let label = "";
                  let currentColor = "#ffffff";
                  let currentTexture = "";

                  const isGroup = selectedPartSelector.startsWith("group:");

                  if (isGroup) {
                    if (selectedPartSelector === "group:camisa") {
                      label = "Camisa Inteira";
                    } else if (selectedPartSelector === "group:mangas") {
                      label = "Todas as Mangas";
                    } else if (selectedPartSelector === "group:frente_costas") {
                      label = "Frente e Costa";
                    }
                  } else {
                    const part = mockupParts.find(
                      (p: any) => p.selector === selectedPartSelector,
                    );
                    label = part ? part.name : selectedPartSelector;
                    currentColor =
                      partColors[selectedPartSelector] || "#ffffff";
                    currentTexture = partTextures[selectedPartSelector] || "";
                  }

                  const applyColor = (color: string) => {
                    if (isGroup) {
                      const targets = getGroupSelectors(selectedPartSelector);
                      setPartColors((prev) => {
                        const updated = { ...prev };
                        targets.forEach((sel) => {
                          updated[sel] = color;
                        });
                        return updated;
                      });
                    } else {
                      setPartColors((prev) => ({
                        ...prev,
                        [selectedPartSelector]: color,
                      }));
                    }
                  };

                  const applyTexture = (textureData: string) => {
                    if (isGroup) {
                      const targets = getGroupSelectors(selectedPartSelector);
                      setPartTextures((prev) => {
                        const updated = { ...prev };
                        targets.forEach((sel) => {
                          updated[sel] = textureData;
                        });
                        return updated;
                      });
                    } else {
                      setPartTextures((prev) => ({
                        ...prev,
                        [selectedPartSelector]: textureData,
                      }));
                    }
                  };

                  const clearCustomization = () => {
                    if (isGroup) {
                      const targets = getGroupSelectors(selectedPartSelector);
                      setPartColors((prev) => {
                        const updated = { ...prev };
                        targets.forEach((sel) => delete updated[sel]);
                        return updated;
                      });
                      setPartTextures((prev) => {
                        const updated = { ...prev };
                        targets.forEach((sel) => delete updated[sel]);
                        return updated;
                      });
                    } else {
                      setPartColors((prev) => {
                        const updated = { ...prev };
                        delete updated[selectedPartSelector];
                        return updated;
                      });
                      setPartTextures((prev) => {
                        const updated = { ...prev };
                        delete updated[selectedPartSelector];
                        return updated;
                      });
                    }
                  };

                  return (
                    <div className="bg-zinc-900/60 border border-white/5 rounded-2xl p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest truncate max-w-[140px] block">
                          Ajustes: {label}
                        </span>
                        {(isGroup ||
                          partColors[selectedPartSelector] ||
                          currentTexture) && (
                          <button
                            onClick={clearCustomization}
                            type="button"
                            className="text-[10px] text-red-500 hover:text-red-400 font-bold uppercase tracking-wider flex items-center gap-1 bg-transparent border-none p-0 cursor-pointer"
                          >
                            <X size={10} /> Resetar
                          </button>
                        )}
                      </div>

                      <div className="space-y-2">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">
                          Cor de Fundo da Parte
                        </span>
                        <div className="flex items-center gap-3">
                          <div
                            className="relative w-8 h-8 rounded-xl overflow-hidden border border-white/10 bg-zinc-950 flex items-center justify-center cursor-pointer hover:border-white/30 transition-all duration-200"
                            onClick={() => setShowPartCmyk((prev) => !prev)}
                            title="Ajuste CMYK (Clique para abrir ajuste)"
                          >
                            <input
                              type="color"
                              value={currentColor}
                              onChange={(e) => applyColor(e.target.value)}
                              className="hidden"
                            />
                            <div
                              className="absolute inset-1 rounded-lg pointer-events-none"
                              style={{ backgroundColor: currentColor }}
                            ></div>
                          </div>

                          <div className="flex flex-wrap gap-1 flex-1">
                            {[
                              "#ffffff",
                              "#000000",
                              "#ef4444",
                              "#3b82f6",
                              "#10b981",
                              "#f59e0b",
                              "#8b5cf6",
                              "#ec4899",
                              "#ff8100",
                            ].map((c) => {
                              const cmyk = hexToCmyk(c);
                              const cmykStr = `C:${cmyk.c} M:${cmyk.m} Y:${cmyk.y} K:${cmyk.k}`;
                              return (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => applyColor(c)}
                                  className="w-5 h-5 rounded-md border border-white/10 hover:border-white/30 transition cursor-pointer box-border"
                                  style={{ backgroundColor: c }}
                                  title={`${c} (${cmykStr})`}
                                />
                              );
                            })}
                          </div>
                        </div>

                        {/* CMYK Panel for Custom Color */}
                        {showPartCmyk &&
                          (() => {
                            const { c, m, y, k } = hexToCmyk(currentColor);
                          const updateSingleCmyk = (
                            key: "c" | "m" | "y" | "k",
                            val: number,
                          ) => {
                            const safeVal = Math.max(
                              0,
                              Math.min(100, isNaN(val) ? 0 : val),
                            );
                            const newCmyk = { c, m, y, k };
                            newCmyk[key] = safeVal;
                            applyColor(
                              cmykToHex(
                                newCmyk.c,
                                newCmyk.m,
                                newCmyk.y,
                                newCmyk.k,
                              ),
                            );
                          };
                          return (
                            <div className="space-y-2 bg-zinc-950/40 p-2.5 rounded-lg border border-white/5">
                              <div className="flex justify-between text-zinc-400 font-bold uppercase tracking-wider text-[8px] mb-1 font-mono">
                                <span>Ajuste CMYK</span>
                                <span className="text-zinc-500 font-normal">
                                  {currentColor.toUpperCase()}
                                </span>
                              </div>

                              {/* CYAN */}
                              <div className="flex items-center gap-2">
                                <span className="text-cyan-400 font-mono text-[10px] w-3 font-bold text-center">
                                  C
                                </span>
                                <input
                                  type="range"
                                  min="0"
                                  max="100"
                                  value={c}
                                  onChange={(e) =>
                                    updateSingleCmyk("c", parseInt(e.target.value))
                                  }
                                  className="flex-1 h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-cyan-400"
                                />
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={c}
                                  onChange={(e) =>
                                    updateSingleCmyk("c", parseInt(e.target.value))
                                  }
                                  className="bg-zinc-900 border border-white/5 rounded px-1.5 py-0.5 text-center text-white text-[9px] w-9 font-mono"
                                />
                                <span className="text-zinc-500 text-[8px] w-2">%</span>
                              </div>

                              {/* MAGENTA */}
                              <div className="flex items-center gap-2">
                                <span
                                  className="font-mono text-[10px] w-3 font-bold text-center"
                                  style={{ color: "#ec4899" }}
                                >
                                  M
                                </span>
                                <input
                                  type="range"
                                  min="0"
                                  max="100"
                                  value={m}
                                  onChange={(e) =>
                                    updateSingleCmyk("m", parseInt(e.target.value))
                                  }
                                  className="flex-1 h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-pink-500"
                                />
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={m}
                                  onChange={(e) =>
                                    updateSingleCmyk("m", parseInt(e.target.value))
                                  }
                                  className="bg-zinc-900 border border-white/5 rounded px-1.5 py-0.5 text-center text-white text-[9px] w-9 font-mono"
                                />
                                <span className="text-zinc-500 text-[8px] w-2">%</span>
                              </div>

                              {/* YELLOW */}
                              <div className="flex items-center gap-2">
                                <span className="text-yellow-400 font-mono text-[10px] w-3 font-bold text-center">
                                  Y
                                </span>
                                <input
                                  type="range"
                                  min="0"
                                  max="100"
                                  value={y}
                                  onChange={(e) =>
                                    updateSingleCmyk("y", parseInt(e.target.value))
                                  }
                                  className="flex-1 h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-yellow-400"
                                />
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={y}
                                  onChange={(e) =>
                                    updateSingleCmyk("y", parseInt(e.target.value))
                                  }
                                  className="bg-zinc-900 border border-white/5 rounded px-1.5 py-0.5 text-center text-white text-[9px] w-9 font-mono"
                                />
                                <span className="text-zinc-500 text-[8px] w-2">%</span>
                              </div>

                              {/* BLACK */}
                              <div className="flex items-center gap-2">
                                <span className="text-zinc-300 font-mono text-[10px] w-3 font-bold text-center">
                                  K
                                </span>
                                <input
                                  type="range"
                                  min="0"
                                  max="100"
                                  value={k}
                                  onChange={(e) =>
                                    updateSingleCmyk("k", parseInt(e.target.value))
                                  }
                                  className="flex-1 h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-zinc-300"
                                />
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={k}
                                  onChange={(e) =>
                                    updateSingleCmyk("k", parseInt(e.target.value))
                                  }
                                  className="bg-zinc-900 border border-white/5 rounded px-1.5 py-0.5 text-center text-white text-[9px] w-9 font-mono"
                                />
                                <span className="text-zinc-500 text-[8px] w-2">%</span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      <div className="space-y-2">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">
                          Imagem / Estampa de Fundo
                        </span>
                        <label className="flex items-center gap-3 p-3 bg-zinc-950 hover:bg-zinc-800 border border-white/5 hover:border-white/10 rounded-xl cursor-pointer transition">
                          <Upload
                            size={16}
                            className={
                              currentTexture || isGroup
                                ? "text-green-400"
                                : "text-primary"
                            }
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-[11px] font-bold text-zinc-300 block truncate">
                              {currentTexture
                                ? "Imagem Ativa (Trocar)"
                                : "Upload de Imagem"}
                            </span>
                            <span className="text-[8px] text-zinc-500 uppercase tracking-wider block font-mono">
                              PNG transparente recomendada
                            </span>
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;

                              if (file.size > 5 * 1024 * 1024) {
                                alert("O arquivo deve ter no máximo 5MB.");
                                return;
                              }

                              const reader = new FileReader();
                              reader.onload = () => {
                                if (typeof reader.result === "string") {
                                  applyTexture(reader.result);
                                }
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  );
                })()}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL SALVAR NO PERFIL */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-[120] flex justify-center items-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in font-sans">
          <div className="bg-[#0c0c0e] border border-white/5 w-full max-w-md rounded-2xl shadow-2xl relative p-6 space-y-4">
            <button
              onClick={() => setIsSaveModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-white/5 rounded-lg transition text-zinc-400 hover:text-white"
            >
              <X size={18} />
            </button>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Save size={18} className="text-primary" />
                Salvar Arte no seu Perfil
              </h3>
              <p className="text-xs text-zinc-400">
                Guarde sua criação e todos os uploads feitos na ferramenta para
                editá-la e visualizá-la quando quiser em "Minha Área".
              </p>
            </div>

            <div className="space-y-1.5 align-left">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block ml-1 text-left">
                Nome da sua Arte
              </label>
              <input
                type="text"
                value={savedArtName}
                onChange={(e) => setSavedArtName(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition text-sm placeholder-zinc-700"
                placeholder="Ex: Minha Camiseta 1"
              />
            </div>

            {saveSuccessMessage ? (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs text-center font-semibold animate-fade-in">
                {saveSuccessMessage}
              </div>
            ) : (
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setIsSaveModalOpen(false)}
                  className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-800 border border-white/5 transition rounded-xl text-xs font-bold uppercase text-zinc-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveToProfile}
                  disabled={isSaving || !savedArtName.trim()}
                  className="flex-1 py-3 bg-primary hover:bg-amber-600 transition rounded-xl text-xs font-bold uppercase text-white disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSaving ? "Salvando..." : "Confirmar Salvar"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL SELECIONAR PÁGINA DO PDF */}
      {isPdfModalOpen && (
        <div className="fixed inset-0 z-[130] flex justify-center items-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in font-sans">
          <div className="bg-[#0c0c0e] border border-white/5 w-full max-w-2xl rounded-2xl shadow-2xl relative p-6 space-y-4 max-h-[90vh] flex flex-col">
            <button
              onClick={() => {
                setIsPdfModalOpen(false);
                setPdfPages([]);
                setUploadedPdfRef(null);
              }}
              className="absolute top-4 right-4 p-1.5 hover:bg-white/5 rounded-lg transition text-zinc-400 hover:text-white"
            >
              <X size={18} />
            </button>
            <div className="space-y-1 pr-6 shrink-0">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText size={18} className="text-primary" />
                Selecione a Página do PDF
              </h3>
              <p className="text-xs text-zinc-400">
                Este PDF possui várias páginas. Escolha qual delas deseja usar de estampa no mockup.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 py-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {pdfPages.map((page) => (
                  <div
                    key={page.pageNum}
                    onClick={() => handleSelectPdfPage(page.pageNum)}
                    className="group bg-zinc-900/60 border border-white/5 hover:border-primary rounded-xl p-3 cursor-pointer transition flex flex-col items-center gap-2 hover:bg-white/[0.02]"
                  >
                    <div className="relative aspect-[3/4] w-full bg-zinc-950 rounded-lg overflow-hidden border border-white/5 flex items-center justify-center p-1">
                      <img
                        src={page.thumbnail}
                        alt={`Página ${page.pageNum}`}
                        className="max-w-full max-h-full object-contain"
                      />
                      <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <span className="text-xs font-bold text-white bg-primary px-3 py-1 rounded-full shadow-lg">
                          Selecionar
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-zinc-400 group-hover:text-white transition">
                      Página {page.pageNum}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2 shrink-0 border-t border-white/5">
              <button
                onClick={() => {
                  setIsPdfModalOpen(false);
                  setPdfPages([]);
                  setUploadedPdfRef(null);
                }}
                className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 border border-white/5 transition rounded-xl text-xs font-bold uppercase text-zinc-400 hover:text-white"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GLOBAL PDF LOADING OVERLAY */}
      {loadingPdf && !isPdfModalOpen && (
        <div className="fixed inset-0 z-[140] flex flex-col justify-center items-center bg-black/70 backdrop-blur-sm gap-3 font-sans">
          <Loader2 className="animate-spin text-primary" size={32} />
          <p className="text-sm font-bold text-white">Carregando PDF...</p>
        </div>
      )}
    </div>
  );
}
