import fragmentShaderSource from "./noise.frag";

const vertexShaderSource = `
attribute vec2 aVertexPosition;
void main() {
  gl_Position = vec4(aVertexPosition, 0, 1);
}`;

let prefersReducedMotion = false;

function loadShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

function createProgram(gl: WebGLRenderingContext): WebGLProgram {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  if(!vertexShader) return null;
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  if(!fragmentShader) return null;

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn('Unable to initialize the shader program: ' + gl.getProgramInfoLog(program));
    return null;
  }

  return program;
}

function renderBacksplash(options: { width?: number, height?: number, animate?: boolean } = {}): boolean {
  const backsplash = document.getElementById("backsplash") as HTMLCanvasElement | null;
  if (!backsplash) return false;

  const animate = options.animate ?? true;

  const gl = backsplash.getContext("webgl", {
    antialias: false,
    preserveDrawingBuffer: !animate
  });

  backsplash.width = options.width ?? backsplash.clientWidth;
  backsplash.height = options.height ?? backsplash.clientHeight;

  if(!options.width || !options.height) window.addEventListener('resize', () => {
    backsplash.width = options.width ?? backsplash.clientWidth;
    backsplash.height = options.height ?? backsplash.clientHeight;
  });

  let buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      -1.0, -1.0,
       1.0, -1.0,
      -1.0,  1.0,
      -1.0,  1.0,
       1.0, -1.0,
       1.0,  1.0]),
    gl.STATIC_DRAW
  );

  const program = createProgram(gl);
  if(!program) return false;

  gl.useProgram(program);

  const startTime = Date.now();

  const programInfo = {
    program,
    attribLocations: {
      vertexPosition: gl.getAttribLocation(program, "aVertexPosition")
    },
    uniformLocations: {
      inputResolution: gl.getUniformLocation(program, "iResolution"),
      inputTime: gl.getUniformLocation(program, "iTime")
    },
  };

  function render() {
    gl.viewport(0, 0, backsplash.width, backsplash.height);
    gl.clearColor(0, 0, 0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 2, gl.FLOAT, false, 0, 0);
    gl.uniform3f(programInfo.uniformLocations.inputResolution, backsplash.width, backsplash.height, 0.0);
    gl.uniform1f(programInfo.uniformLocations.inputTime, (Date.now() - startTime) / 1000);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    if(animate && !prefersReducedMotion)
      window.requestAnimationFrame(render);
  }

  render();
  return true;
}

function run() {
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  prefersReducedMotion = mediaQuery.matches;
  mediaQuery.addEventListener('change', () => prefersReducedMotion = mediaQuery.matches);

  if(prefersReducedMotion || !renderBacksplash()) {
    const div = document.createElement("div");
    div.className = "image";
    document.getElementById("backsplash-container").appendChild(div);
  }
}

document.addEventListener('DOMContentLoaded', run, false);
