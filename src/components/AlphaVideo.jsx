import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

/**
 * A looping video with a see-through background that works in every browser (Safari can't play WebM alpha).
 *
 * The file is a "stacked alpha" MP4: the picture in the top half (its colour already multiplied by alpha),
 * the alpha as grey in the bottom half, each half followed by `pad` empty rows. A WebGL canvas puts the two
 * halves back together on every frame. Until the first frame is drawn, without WebGL, or with "reduce
 * motion", a transparent still (`still`) is shown instead.
 */
export default function AlphaVideo({ src, still, width, height, pad = 8, className = '' }) {
  const canvasRef = useRef(null)
  const videoRef = useRef(null)
  const reduce = useReducedMotion()
  const [live, setLive] = useState(false) // a video frame is on the canvas (the still is hidden)

  useEffect(() => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (reduce || !canvas || !video) return
    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false })
    if (!gl) return // the still stays

    const total = 2 * (height + pad)
    const f = (n) => n.toFixed(1)
    const program = link(
      gl,
      'attribute vec2 p;varying vec2 uv;void main(){uv=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}',
      `precision mediump float;varying vec2 uv;uniform sampler2D t;
      void main(){
        float y=.5+uv.y*${f(height - 1)};
        vec3 c=texture2D(t,vec2(uv.x,y/${f(total)})).rgb;
        float a=texture2D(t,vec2(uv.x,(y+${f(height + pad)})/${f(total)})).g;
        a=clamp((a-.02)/.96,0.,1.);
        gl_FragColor=vec4(min(c,vec3(a)),a);
      }`,
    )
    if (!program) return
    gl.useProgram(program)
    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(program, 'p')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    const texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.clearColor(0, 0, 0, 0)

    let stopped = false
    let handle = 0
    let lastTime = -1
    let shown = false
    const usesFrameCallback = 'requestVideoFrameCallback' in video
    const render = (force) => {
      if (video.readyState < 2) return
      if (!force && !usesFrameCallback && video.currentTime === lastTime) return // same frame as last time
      lastTime = video.currentTime
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      if (!shown) {
        shown = true
        setLive(true)
      }
    }
    const tick = () => {
      if (stopped) return
      render(false)
      handle = usesFrameCallback ? video.requestVideoFrameCallback(tick) : requestAnimationFrame(tick)
    }

    // the canvas has as many pixels as it is shown with (never more than the video has)
    const fit = () => {
      const dpr = window.devicePixelRatio || 1
      const w = Math.max(1, Math.min(width, Math.round(canvas.clientWidth * dpr)))
      const h = Math.max(1, Math.round((w * height) / width))
      if (canvas.width === w && canvas.height === h) return
      canvas.width = w
      canvas.height = h
      gl.viewport(0, 0, w, h)
      render(true) // resizing clears the canvas
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(canvas)

    const play = () => {
      video.muted = true // set as a property too: some phones only autoplay a video muted before play()
      video.play().catch(() => {}) // refused (power saving): the still stays
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible' && video.paused) play()
    }
    document.addEventListener('visibilitychange', onVisible)
    play()
    tick()

    return () => {
      stopped = true
      if (usesFrameCallback) video.cancelVideoFrameCallback?.(handle)
      else cancelAnimationFrame(handle)
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVisible)
      video.pause()
      // (the context itself stays: the same canvas hands it out again if this effect runs again)
      gl.deleteTexture(texture)
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
      setLive(false)
    }
  }, [reduce, width, height, pad])

  return (
    <div className={`pointer-events-none relative select-none ${className}`} style={{ aspectRatio: `${width} / ${height}` }} aria-hidden="true">
      <img src={still} alt="" className={`absolute inset-0 h-full w-full ${live ? 'opacity-0' : ''}`} draggable={false} />
      <canvas ref={canvasRef} className={`absolute inset-0 h-full w-full ${live ? '' : 'opacity-0'}`} />
      {/* the source frames: decoded here, drawn by the canvas */}
      <video ref={videoRef} src={src} className="hidden" muted loop playsInline preload="auto" disablePictureInPicture />
    </div>
  )
}

function link(gl, vertex, fragment) {
  const program = gl.createProgram()
  for (const [type, source] of [
    [gl.VERTEX_SHADER, vertex],
    [gl.FRAGMENT_SHADER, fragment],
  ]) {
    const shader = gl.createShader(type)
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn('[AlphaVideo]', gl.getShaderInfoLog(shader))
      return null
    }
    gl.attachShader(program, shader)
  }
  gl.linkProgram(program)
  return gl.getProgramParameter(program, gl.LINK_STATUS) ? program : null
}
