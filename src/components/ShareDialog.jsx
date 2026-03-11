import { useEffect, useState } from "react";
import { buildShareQrFileName, createShareQrDownloadUrl } from "../lib/qr";

export default function ShareDialog({ session, shareUrl, onClose, onCopy }) {
  const [qrImageUrl, setQrImageUrl] = useState("");
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState("");
  const [downloadBusy, setDownloadBusy] = useState(false);

  useEffect(() => {
    if (!session || !shareUrl) {
      setQrImageUrl("");
      setQrLoading(false);
      setQrError("");
      return undefined;
    }

    let cancelled = false;
    setQrLoading(true);
    setQrError("");

    createShareQrDownloadUrl(session, shareUrl)
      .then((nextImageUrl) => {
        if (!cancelled) {
          setQrImageUrl(nextImageUrl);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setQrError(error.message || "QR 이미지를 만들지 못했습니다.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setQrLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session, shareUrl]);

  if (!session) {
    return null;
  }

  function handleDownload() {
    if (!qrImageUrl) {
      return;
    }

    setDownloadBusy(true);

    try {
      const link = document.createElement("a");
      link.href = qrImageUrl;
      link.download = buildShareQrFileName(session);
      document.body.append(link);
      link.click();
      link.remove();
    } finally {
      setDownloadBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="dialog-card dialog-card-share" onClick={(event) => event.stopPropagation()}>
        <div className="dialog-header">
          <p className="eyebrow">링크 공유</p>
          <h3>서명 링크 공유</h3>
          <p>{session.title}</p>
        </div>

        <div className="share-qr share-qr-card-shell">
          {qrLoading ? (
            <div className="share-qr-loading">
              <div className="loading-spinner loading-spinner-small" />
              <p>QR 이미지를 준비하는 중입니다.</p>
            </div>
          ) : null}

          {!qrLoading && qrError ? <p className="inline-feedback inline-feedback-error">{qrError}</p> : null}

          {!qrLoading && !qrError && qrImageUrl ? (
            <>
              <img className="share-qr-card-image" src={qrImageUrl} alt={`${session.title} QR 코드`} />
              <p className="micro-copy share-qr-caption">
                다운로드 파일명: {buildShareQrFileName(session)}
              </p>
            </>
          ) : null}
        </div>

        <div className="share-url-row">
          <input readOnly value={shareUrl} />
          <button className="mini-button" onClick={onCopy}>
            복사
          </button>
        </div>

        <div className="dialog-actions">
          <a className="secondary-link" href={shareUrl} target="_blank" rel="noreferrer">
            새 창에서 열기
          </a>
          <button className="ghost-button" disabled={!qrImageUrl || downloadBusy} onClick={handleDownload}>
            {downloadBusy ? "다운로드 중..." : "QR 이미지 저장"}
          </button>
          <button className="action-button action-button-primary" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
