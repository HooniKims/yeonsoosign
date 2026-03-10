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
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    dirtyRef.current = false;
    setIsDirty(false);
  }

  function startDrawing(event) {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    const point = getPoint(event, canvas);
    drawingRef.current = true;
    context.beginPath();
    context.moveTo(point.x, point.y);
    event.preventDefault();
  }

  function draw(event) {
    if (!drawingRef.current) {
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
      <div className="dialog-card dialog-card-signature">
        <div className="dialog-header dialog-header-center">
          <p className="eyebrow">서명 대상 연수</p>
          <h3>{sessionTitle}</h3>
          <p className="signature-name">{participantName}님 서명</p>
          <p className="signature-caption">칸에 맞추어 서명을 크게, 정자로 써주세요.</p>
        </div>

        <div className="signature-pad">
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
        </div>

        <div className="dialog-actions dialog-actions-split">
          <button className="ghost-button" onClick={clearSignature}>
            다시 쓰기
          </button>
          <button className="ghost-button" onClick={onCancel}>
            취소
          </button>
          <button
            className="action-button action-button-primary"
            disabled={!isDirty}
            onClick={() => onSave(canvasRef.current.toDataURL("image/png"))}
          >
            서명 완료
          </button>
        </div>
      </div>
    </div>
  );
}
