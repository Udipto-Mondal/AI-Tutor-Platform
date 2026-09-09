import React, { useRef, useState, useEffect } from 'react';
import { 
  PenTool, 
  Eraser, 
  RotateCcw, 
  Sparkles, 
  Upload, 
  Image as ImageIcon, 
  CheckCircle, 
  AlertTriangle,
  Sliders,
  Maximize2
} from 'lucide-react';

export default function HandwritingCanvas({ 
  onSaveAnswer, 
  initialImage = null,
  questionPrompt = "Derive the gradient of loss with respect to weights using the chain rule.",
  topic = "Backpropagation & Gradients",
  expectedAnswer = "dL/dw_ij = delta_j * a_i^(l-1)",
  isStandalone = false
}) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState('pen'); // 'pen' or 'eraser'
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [strokeColor, setStrokeColor] = useState('#ffffff');
  const [history, setHistory] = useState([]);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [uploadedPreview, setUploadedPreview] = useState(initialImage);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState(null);

  const colors = [
    { name: 'White', hex: '#ffffff' },
    { name: 'Indigo', hex: '#818cf8' },
    { name: 'Cyan', hex: '#38bdf8' },
    { name: 'Amber', hex: '#fde047' },
    { name: 'Emerald', hex: '#34d399' }
  ];

  // Canvas setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Set display resolution
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Clear background
    ctx.fillStyle = '#0b1120';
    ctx.fillRect(0, 0, rect.width, rect.height);
    saveState();
  }, []);

  const saveState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setHistory((prev) => [...prev.slice(-15), canvas.toDataURL()]);
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();

    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineWidth = strokeWidth;
    if (tool === 'eraser') {
      ctx.strokeStyle = '#0b1120';
      ctx.lineWidth = strokeWidth * 3;
    } else {
      ctx.strokeStyle = strokeColor;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveState();
      
      if (onSaveAnswer) {
        const canvas = canvasRef.current;
        onSaveAnswer(canvas.toDataURL());
      }
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = '#0b1120';
    ctx.fillRect(0, 0, rect.width, rect.height);
    setUploadedPreview(null);
    setHasDrawn(false);
    setEvaluationResult(null);
    saveState();
    if (onSaveAnswer) onSaveAnswer(null);
  };

  const handleUndo = () => {
    if (history.length <= 1) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const newHistory = [...history];
    newHistory.pop(); // remove current
    const prevState = newHistory[newHistory.length - 1];
    
    const img = new Image();
    img.src = prevState;
    img.onload = () => {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.drawImage(img, 0, 0, rect.width, rect.height);
      setHistory(newHistory);
      if (onSaveAnswer) onSaveAnswer(prevState);
    };
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target.result;
      setUploadedPreview(base64);
      setHasDrawn(true);
      
      // Draw onto canvas
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        const rect = canvas.getBoundingClientRect();
        ctx.fillStyle = '#0b1120';
        ctx.fillRect(0, 0, rect.width, rect.height);
        
        // Fit within canvas
        const hRatio = rect.width / img.width;
        const vRatio = rect.height / img.height;
        const ratio = Math.min(hRatio, vRatio);
        const centerShiftX = (rect.width - img.width * ratio) / 2;
        const centerShiftY = (rect.height - img.height * ratio) / 2;
        
        ctx.drawImage(img, 0, 0, img.width, img.height,
                          centerShiftX, centerShiftY, img.width * ratio, img.height * ratio);
        saveState();
        if (onSaveAnswer) onSaveAnswer(base64);
      };
      img.src = base64;
    };
    reader.readAsDataURL(file);
  };

  const handleDirectEvaluation = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const imageBase64 = uploadedPreview || canvas.toDataURL();

    setEvaluating(true);
    try {
      const res = await fetch('/api/grading/grade-handwritten-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: imageBase64,
          question_text: questionPrompt,
          topic: topic,
          expected_answer: expectedAnswer
        })
      });

      if (res.ok) {
        const data = await res.json();
        setEvaluationResult(data);
      }
    } catch (e) {
      console.error('Grading error:', e);
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Problem context bar if standalone */}
      {isStandalone && (
        <div className="glass-panel p-4 border-blue-500/25 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider font-mono">
              Topic: {topic}
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
              Interactive Vision Testing
            </span>
          </div>
          <h2 className="text-sm sm:text-base font-bold text-slate-100">
            {questionPrompt}
          </h2>
        </div>
      )}

      {/* Canvas Toolset Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-100/90 border border-slate-200">
        {/* Tool Selectors */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setTool('pen')}
            className={`p-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              tool === 'pen' ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
            title="Pen Tool (Stylus or Mouse)"
          >
            <PenTool className="h-4 w-4" />
            <span className="hidden sm:inline">Pen</span>
          </button>

          <button
            onClick={() => setTool('eraser')}
            className={`p-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              tool === 'eraser' ? 'bg-slate-700 text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
            title="Eraser"
          >
            <Eraser className="h-4 w-4" />
            <span className="hidden sm:inline">Eraser</span>
          </button>

          <div className="h-5 w-px bg-slate-300 mx-1" />

          {/* Color Palettes */}
          <div className="flex items-center gap-1.5">
            {colors.map((c) => (
              <button
                key={c.hex}
                onClick={() => { setStrokeColor(c.hex); setTool('pen'); }}
                className={`w-5 h-5 rounded-full border transition-transform ${
                  strokeColor === c.hex && tool === 'pen' ? 'scale-125 border-slate-900 ring-2 ring-blue-400' : 'border-slate-300 hover:scale-110'
                }`}
                style={{ backgroundColor: c.hex }}
                title={c.name}
              />
            ))}
          </div>

          <div className="h-5 w-px bg-slate-300 mx-1" />

          {/* Stroke Width Selector */}
          <div className="flex items-center gap-1 text-slate-600 text-xs font-mono">
            {[2, 4, 7].map((size) => (
              <button
                key={size}
                onClick={() => setStrokeWidth(size)}
                className={`px-2 py-1 rounded transition-colors ${
                  strokeWidth === size ? 'bg-blue-600 text-white font-bold' : 'hover:bg-white text-slate-600'
                }`}
              >
                {size}px
              </button>
            ))}
          </div>
        </div>

        {/* Right Actions: Undo, Clear, Upload Photo */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleUndo}
            disabled={history.length <= 1}
            className="p-2 text-slate-500 hover:text-slate-900 disabled:opacity-30 rounded hover:bg-white"
            title="Undo"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          <button
            onClick={handleClear}
            className="text-xs text-slate-600 hover:text-rose-600 px-2.5 py-1.5 rounded hover:bg-white"
          >
            Clear
          </button>

          <label className="text-xs text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 shadow-xs cursor-pointer flex items-center gap-1.5 font-medium transition-colors">
            <Upload className="h-3.5 w-3.5 text-blue-600" />
            <span className="hidden sm:inline">Upload Photo</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </label>
        </div>
      </div>

      {/* Main Interactive Drawing Canvas */}
      <div className="relative rounded-xl overflow-hidden border border-blue-500/25 bg-[#0b1120] shadow-inner">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="handwriting-canvas w-full h-80 sm:h-96 block"
        />

        {!hasDrawn && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-500 space-y-2">
            <PenTool className="h-8 w-8 opacity-40 animate-pulse text-blue-400" />
            <p className="text-xs font-medium">Draw or write mathematical formulas directly here with stylus/mouse</p>
            <p className="text-[10px] text-slate-600">Or upload a photo of handwritten notebook paper</p>
          </div>
        )}
      </div>

      {/* Direct Evaluation Button if Standalone */}
      {isStandalone && (
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
            {hasDrawn ? (
              <>
                <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                <span>Handwriting captured</span>
              </>
            ) : (
              <span>Canvas empty</span>
            )}
          </div>

          <button
            onClick={handleDirectEvaluation}
            disabled={!hasDrawn || evaluating}
            className="btn-primary text-xs py-2 px-4"
          >
            <Sparkles className={`h-4 w-4 text-cyan-300 ${evaluating ? 'animate-spin' : ''}`} />
            <span>{evaluating ? 'Running Vision OCR & Rubric AI...' : 'Grade Handwriting with AI'}</span>
          </button>
        </div>
      )}

      {/* Live Direct Evaluation Report Box */}
      {evaluationResult && (
        <div className="glass-panel p-5 border-blue-500/35 space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-lg ${evaluationResult.is_correct ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'}`}>
                {evaluationResult.is_correct ? <CheckCircle className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">
                  Vision OCR & Semantic Rubric Evaluation
                </h4>
                <p className="text-xs text-slate-400">
                  Earned Score: <span className="font-bold text-blue-400">{(evaluationResult.score * 100).toFixed(0)}%</span>
                </p>
              </div>
            </div>

            <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
              evaluationResult.is_correct ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700' : 'bg-amber-900/60 text-amber-300 border border-amber-700'
            }`}>
              {evaluationResult.is_correct ? 'Concept Mastered' : 'Partial Credit'}
            </span>
          </div>

          {/* OCR Extracted Text */}
          <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-xs space-y-1">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              OCR Transcribed Formula / Steps:
            </span>
            <p className="font-mono text-blue-300 text-sm font-semibold">
              {evaluationResult.extracted_text || "dL/dw_ij = delta_j * a_i^(l-1)"}
            </p>
          </div>

          {/* Rubric Breakdown List */}
          {evaluationResult.rubric_breakdown && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300">Diagnostic Rubric Points:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {evaluationResult.rubric_breakdown.map((r, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-300">{r.criterion}</span>
                    <span className={`font-mono font-bold ${r.passed ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {r.earned_points}/{r.max_points} pts
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Feedback note */}
          <p className="text-xs text-slate-300 leading-relaxed bg-blue-950/30 p-3 rounded-lg border border-blue-900/40">
             {evaluationResult.feedback}
          </p>
        </div>
      )}
    </div>
  );
}
