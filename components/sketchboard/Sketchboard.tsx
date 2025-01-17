"use client";
import { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Paintbrush, Eraser, Undo2, Download, Square, Circle, 
  MousePointer, Rainbow, Move, Copy, RotateCw, Layers
} from 'lucide-react';

const Sketchboard = () => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState('brush');
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(5);
  const [drawHistory, setDrawHistory] = useState([]);
  const [currentStep, setCurrentStep] = useState(-1);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [rainbowMode, setRainbowMode] = useState(false);
  const [symmetryLines, setSymmetryLines] = useState(1);
  const [shapes, setShapes] = useState([]);
  const [selectedShape, setSelectedShape] = useState(null);
  const [mirrorMode, setMirrorMode] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const saveToHistory = (imageData) => {

    const newHistory = drawHistory.slice(0, currentStep + 1);
    setDrawHistory([...newHistory, imageData]);
    setCurrentStep(currentStep + 1);
  };

  useEffect(() => {
    if (!isInitialized) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // Set initial canvas background to white
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Save initial state
      const initialState = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setDrawHistory([initialState]);
      setCurrentStep(0);
      setIsInitialized(true);
    }
  }, [isInitialized]);

  const getRainbowColor = () => {
    const hue = (Date.now() / 10) % 360;
    return `hsl(${hue}, 100%, 50%)`;
  };


  const drawSymmetric = (ctx, x, y) => {
    const centerX = ctx.canvas.width / 2;
    const centerY = ctx.canvas.height / 2;
    const angle = (Math.PI * 2) / symmetryLines;

    for (let i = 0; i < symmetryLines; i++) {
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(angle * i);
      ctx.translate(-centerX, -centerY);
      
      const dx = x - centerX;
      const dy = y - centerY;
      ctx.lineTo(centerX + dx, centerY + dy);
      ctx.stroke();
      
      if (mirrorMode) {
        ctx.lineTo(centerX - dx, centerY + dy);
        ctx.stroke();
      }
      
      ctx.restore();
    }
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setStartPos({ x, y });

    if (tool === 'select') {
      const clickedShape = shapes.find(shape => {
        const dx = x - shape.x;
        const dy = y - shape.y;
        return Math.sqrt(dx * dx + dy * dy) < shape.size;
      });
      setSelectedShape(clickedShape);
      return;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = rainbowMode ? getRainbowColor() : (tool === 'eraser' ? 'white' : color);
    ctx.lineWidth = lineWidth;
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (tool === 'select' && selectedShape) {
      const newShapes = shapes.map(shape => 
        shape === selectedShape 
          ? { ...shape, x, y }
          : shape
      );
      setShapes(newShapes);
      redrawCanvas();
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.putImageData(drawHistory[currentStep], 0, 0);

    if (tool === 'square' || tool === 'circle') {
      const size = Math.max(
        Math.abs(x - startPos.x),
        Math.abs(y - startPos.y)
      );
      
      if (tool === 'square') {
        ctx.strokeRect(startPos.x, startPos.y, x - startPos.x, y - startPos.y);
      } else {
        ctx.beginPath();
        ctx.ellipse(
          startPos.x + (x - startPos.x) / 2,
          startPos.y + (y - startPos.y) / 2,
          Math.abs(x - startPos.x) / 2,
          Math.abs(y - startPos.y) / 2,
          0,
          0,
          2 * Math.PI
        );
        ctx.stroke();
      }
    } else {
      if (rainbowMode) {
        ctx.strokeStyle = getRainbowColor();
      }
      
      if (symmetryLines > 1) {
        drawSymmetric(ctx, x, y);
      } else {
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    }
  };

  const stopDrawing = () => {
    if (isDrawing) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (tool === 'square' || tool === 'circle') {
        setShapes([...shapes, { 
          type: tool, 
          x: startPos.x, 
          y: startPos.y, 
          size: Math.max(
            Math.abs(startPos.x - canvas.width/2),
            Math.abs(startPos.y - canvas.height/2)
          )
        }]);
      }
      
      saveToHistory(ctx.getImageData(0, 0, canvas.width, canvas.height));
      setIsDrawing(false);
      setSelectedShape(null);
    }
  };

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.putImageData(drawHistory[currentStep], 0, 0);
    
    shapes.forEach(shape => {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      
      if (shape.type === 'square') {
        ctx.strokeRect(shape.x, shape.y, shape.size, shape.size);
      } else if (shape.type === 'circle') {
        ctx.beginPath();
        ctx.arc(shape.x + shape.size/2, shape.y + shape.size/2, shape.size/2, 0, 2 * Math.PI);
        ctx.stroke();
      }
    });
  };

  const undo = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.putImageData(drawHistory[currentStep - 1], 0, 0);
    }
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = 'sketch.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Advanced Sketchboard</CardTitle>
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex space-x-2">
            <Button
              variant={tool === 'brush' ? 'default' : 'outline'}
              onClick={() => setTool('brush')}
              className="w-10 h-10 p-2"
              title="Brush"
            >
              <Paintbrush className="h-5 w-5" />
            </Button>
            <Button
              variant={tool === 'eraser' ? 'default' : 'outline'}
              onClick={() => setTool('eraser')}
              className="w-10 h-10 p-2"
              title="Eraser"
            >
              <Eraser className="h-5 w-5" />
            </Button>
            <Button
              variant={tool === 'square' ? 'default' : 'outline'}
              onClick={() => setTool('square')}
              className="w-10 h-10 p-2"
              title="Square"
            >
              <Square className="h-5 w-5" />
            </Button>
            <Button
              variant={tool === 'circle' ? 'default' : 'outline'}
              onClick={() => setTool('circle')}
              className="w-10 h-10 p-2"
              title="Circle"
            >
              <Circle className="h-5 w-5" />
            </Button>
            <Button
              variant={tool === 'select' ? 'default' : 'outline'}
              onClick={() => setTool('select')}
              className="w-10 h-10 p-2"
              title="Select"
            >
              <MousePointer className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex space-x-2">
            <Button
              variant={rainbowMode ? 'default' : 'outline'}
              onClick={() => setRainbowMode(!rainbowMode)}
              className="w-10 h-10 p-2"
              title="Rainbow Mode"
            >
              <Rainbow className="h-5 w-5" />
            </Button>
            <Button
              variant={mirrorMode ? 'default' : 'outline'}
              onClick={() => setMirrorMode(!mirrorMode)}
              className="w-10 h-10 p-2"
              title="Mirror Mode"
            >
              <Copy className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              onClick={() => setSymmetryLines(prev => (prev % 8) + 1)}
              className="w-10 h-10 p-2"
              title="Symmetry Lines"
            >
              <RotateCw className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={undo}
              className="w-10 h-10 p-2"
              title="Undo"
            >
              <Undo2 className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              onClick={downloadCanvas}
              className="w-10 h-10 p-2"
              title="Download"
            >
              <Download className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-10"
              title="Color Picker"
            />
            <input
              type="range"
              min="1"
              max="20"
              value={lineWidth}
              onChange={(e) => setLineWidth(parseInt(e.target.value))}
              className="w-32"
              title="Brush Size"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="border border-gray-200 rounded-lg cursor-crosshair bg-white"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
        />
      </CardContent>
    </Card>
  );
};

export default Sketchboard;