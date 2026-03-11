import { useEffect, useRef, useState } from "react";

function getPoint(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  const source = "touches" in event && event.touches[0] ? event.touches[0] : event;

  return {
    x: source.clientX - rect.left,
    y: source.clientY - rect.top,
  };
}

export default function SignatureModal({
  participantName,
  sessionTitle,
  onCancel,
  onSave,
  saving = false,
}) {
  const canvasRef = useRef(null);
  const dirtyRef = useRef(false);
  const drawingRef = useRef(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    context.scale(ratio, ratio);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = 3;
    context.strokeStyle = "#1f3bb3";
  }, []);

  function clearSignature() {
    if (saving) {
      return;
    }

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    dirtyRef.current = false;
    setIsDirty(false);
  }

  function startDrawing(event) {
    if (saving) {
      return;
    }

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    const point = getPoint(event, canvas);
    drawingRef.current = true;
    context.beginPath();
    context.moveTo(point.x, point.y);
    event.preventDefault();
  }

  function draw(event) {
    if (!drawingRef.current || saving) {
      return;
    }

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    const point = getPoint(event, canvas);
    context.lineTo(point.x, point.y);
    context.stroke();
    dirtyRef.current = true;
    setIsDirty(true);
    event.preventDefault();
  }

  function finishDrawing(event) {
    if (!drawingRef.current) {
      return;
    }

    drawingRef.current = false;
    event.preventDefault();
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div className={`dialog-card dialog-card-signature ${saving ? "dialog-card-saving" : ""}`}>
        <div className="dialog-header dialog-header-center">
          <p className="eyebrow">서명 등록 연수</p>
          <h3>{sessionTitle}</h3>
          <p className="signature-name">{participantName}님 서명</p>
          <p className="signature-caption">칸에 맞춰 서명해 주세요. 확인 버튼을 누르면 바로 등록됩니다.</p>
        </div>

        <div className="signature-pad signature-pad-shell">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={finishDrawing}
            onMouseLeave={finishDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={finishDrawing}
          />

          {saving ? (
            <div className="signature-saving-mask">
              <div className="loading-spinner loading-spinner-small" />
              <p>서명을 등록하는 중입니다.</p>
            </div>
          ) : null}
        </div>

        {saving ? (
          <p className="inline-feedback inline-feedback-loading signature-saving-feedback">
            잠시만 기다려 주세요. 저장이 끝나면 창이 자동으로 닫힙니다.
          </p>
        ) : null}

        <div className="dialog-actions dialog-actions-split">
          <button className="ghost-button" disabled={saving} onClick={clearSignature}>
            다시 그리기
          </button>
          <button className="ghost-button" disabled={saving} onClick={onCancel}>
            취소
          </button>
          <button
            className="action-button action-button-primary"
            disabled={!isDirty || saving}
            onClick={() => onSave(canvasRef.current.toDataURL("image/png"))}
          >
            {saving ? "등록 중..." : "서명 완료"}
          </button>
        </div>
      </div>
    </div>
  );
}
