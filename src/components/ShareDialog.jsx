export default function ShareDialog({ session, shareUrl, onClose, onCopy }) {
  if (!session) {
    return null;
  }

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(shareUrl)}`;

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="dialog-card dialog-card-share" onClick={(event) => event.stopPropagation()}>
        <div className="dialog-header">
          <p className="eyebrow">링크 공유</p>
          <h3>서명 링크 공유</h3>
          <p>{session.title}</p>
        </div>

        <div className="share-qr">
          <img src={qrUrl} alt={`${session.title} QR 코드`} />
        </div>

        <div className="share-url-row">
          <input readOnly value={shareUrl} />
          <button className="mini-button" onClick={onCopy}>
            복사
          </button>
        </div>

        <div className="dialog-actions">
          <a className="secondary-link" href={shareUrl} target="_blank" rel="noreferrer">
            새 탭에서 열기
          </a>
          <button className="action-button action-button-primary" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
