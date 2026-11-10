/* ОСТРОВ МЕЧТЫ V33 — local WebGL1 mesh renderer; no external dependencies. */
"use strict";
(function () {
  const vertex = `precision mediump float;attribute vec3 p;attribute vec2 uv;attribute float mat;varying vec2 vuv;varying float vm;varying float vd;varying vec3 wp;uniform vec3 eye;uniform float yaw;uniform float pitch;void main(){vec3 q=p-eye;float f=cos(yaw)*q.x+sin(yaw)*q.y;float r=-sin(yaw)*q.x+cos(yaw)*q.y;float h=q.z-pitch*f;vuv=uv;vm=mat;vd=f;wp=p;gl_Position=vec4(r*1.83,h*3.15,f*1.002-.035,f);}`;
  const fragment = `precision mediump float;varying vec2 vuv;varying float vm;varying float vd;varying vec3 wp;uniform float powered;uniform float torch;uniform vec3 eye;float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}void main(){float grain=hash(floor(vuv*vec2(22.,18.)));float rust=smoothstep(.73,.97,hash(floor(vuv*vec2(8.,9.))));vec3 c;float t=mod(vm,10.);if(t<.5){c=mix(vec3(.12,.15,.16),vec3(.24,.26,.25),grain*.55);c=mix(c,vec3(.28,.13,.08),rust*.4);float joint=step(.975,fract(vuv.x*3.))+step(.985,fract(vuv.y*2.));c*=1.-min(.5,joint*.36);}else if(t<1.5){c=mix(vec3(.13,.16,.17),vec3(.25,.28,.28),grain*.7);c*=.83+.17*abs(sin(vuv.x*5.));}else if(t<2.5){c=mix(vec3(.10,.12,.13),vec3(.18,.20,.20),grain*.8);c+=vec3(.025,.033,.033)*step(.97,fract(vuv.x*7.));}else if(t<3.5){c=mix(vec3(.20,.13,.09),vec3(.38,.26,.17),grain*.6);c*=.84+.16*step(.07,fract(vuv.y*5.));}else if(t<4.5){c=mix(vec3(.18,.23,.23),vec3(.29,.33,.30),grain*.6);c=mix(c,vec3(.32,.14,.09),rust*.65);}else if(t<5.5){c=mix(vec3(.10,.31,.24),vec3(.19,.55,.38),grain*.35);}else if(t<6.5){c=mix(vec3(.35,.27,.18),vec3(.63,.48,.29),grain*.35);}else if(t<7.5){c=mix(vec3(.23,.26,.42),vec3(.42,.48,.68),grain*.35);}else if(t<8.5){c=mix(vec3(.27,.20,.29),vec3(.50,.35,.53),grain*.35);}else{c=mix(vec3(.55,.42,.21),vec3(.85,.70,.35),grain*.35);} float nearTorch=max(0.,1.-length(wp.xy-eye.xy)/6.);float beam=max(0.,1.-abs(wp.z-eye.z)*.6);float lit=.36+powered*.25+torch*nearTorch*beam*.9;float moon=max(0.,1.-abs(wp.x-14.)/21.)*.09;c*=lit+moon;float fog=clamp((vd-3.)/20.,0.,.74);c=mix(c,vec3(.022,.043,.054),fog);gl_FragColor=vec4(c,1.);}`;
  function shader(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
      throw Error(gl.getShaderInfoLog(s));
    return s;
  }
  function make(gl) {
    const pr = gl.createProgram();
    gl.attachShader(pr, shader(gl, gl.VERTEX_SHADER, vertex));
    gl.attachShader(pr, shader(gl, gl.FRAGMENT_SHADER, fragment));
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS))
      throw Error(gl.getProgramInfoLog(pr));
    return pr;
  }
  function create(grid, props, keys = {}) {
    const view = document.getElementById("view");
    const canvas = document.createElement("canvas");
    canvas.id = "view3d";
    canvas.width = 960;
    canvas.height = 540;
    canvas.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:block";
    view.parentElement.insertBefore(canvas, view.nextSibling);
    const actors = document.createElement("canvas");
    actors.width = 960;
    actors.height = 540;
    actors.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;pointer-events:none";
    canvas.parentElement.insertBefore(actors, canvas.nextSibling);
    const actorCtx = actors.getContext("2d");
    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: true,
      preserveDrawingBuffer: false,
    });
    if (!gl) {
      canvas.remove();
      actors.remove();
      return null;
    }
    let program;
    try {
      program = make(gl);
    } catch (error) {
      canvas.remove();
      actors.remove();
      throw error;
    }
    gl.useProgram(program);
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0.015, 0.026, 0.033, 1);
    let data = [];
    function tri(a, b, c, mat, u0, v0, u1, v1, u2, v2) {
      for (const [p, u, v] of [
        [a, u0, v0],
        [b, u1, v1],
        [c, u2, v2],
      ])
        data.push(...p, u, v, mat);
    }
    function quad(a, b, c, d, mat, repeat = 1) {
      tri(a, b, c, mat, 0, 0, repeat, 0, repeat, repeat);
      tri(a, c, d, mat, 0, 0, repeat, repeat, 0, repeat);
    }
    function box(x, y, z, w, d, h, mat) {
      const a = [x, y, z],
        b = [x + w, y, z],
        c = [x + w, y + d, z],
        e = [x, y + d, z],
        A = [x, y, z + h],
        B = [x + w, y, z + h],
        C = [x + w, y + d, z + h],
        E = [x, y + d, z + h];
      quad(e, c, b, a, mat);
      quad(A, B, C, E, mat);
      quad(a, b, B, A, mat);
      quad(b, c, C, B, mat);
      quad(c, e, E, C, mat);
      quad(e, a, A, E, mat);
    }
    const H = 1.7;
    for (let y = 0; y < grid.length; y++)
      for (let x = 0; x < grid[y].length; x++) {
        if (grid[y][x]) continue;
        quad([x, y, 0], [x, y + 1, 0], [x + 1, y + 1, 0], [x + 1, y, 0], 1);
        quad([x, y, H], [x + 1, y, H], [x + 1, y + 1, H], [x, y + 1, H], 2);
        if (grid[y - 1]?.[x] !== 0)
          quad([x, y, 0], [x + 1, y, 0], [x + 1, y, H], [x, y, H], 0);
        if (grid[y + 1]?.[x] !== 0)
          quad(
            [x + 1, y + 1, 0],
            [x, y + 1, 0],
            [x, y + 1, H],
            [x + 1, y + 1, H],
            0,
          );
        if (grid[y]?.[x - 1] !== 0)
          quad([x, y + 1, 0], [x, y, 0], [x, y, H], [x, y + 1, H], 0);
        if (grid[y]?.[x + 1] !== 0)
          quad(
            [x + 1, y, 0],
            [x + 1, y + 1, 0],
            [x + 1, y + 1, H],
            [x + 1, y, H],
            0,
          );
        if ((x * 7 + y * 13) % 11 === 0)
          box(x + 0.08, y + 0.07, 1.45, 0.1, 0.86, 0.11, 4);
        if ((x * 5 + y * 3) % 13 === 0)
          box(x + 0.07, y + 0.09, 0.01, 0.85, 0.035, 0.025, 4);
      }
    for (const o of props) {
      if (o.type === "crate")
        box(o.x - 0.33, o.y - 0.33, 0, 0.66, 0.66, 0.66, 3);
      else if (o.type === "barrel")
        box(o.x - 0.23, o.y - 0.23, 0, 0.46, 0.46, 0.77, 4);
      else if (o.type === "tool")
        box(o.x - 0.34, o.y - 0.22, 0, 0.68, 0.44, 0.9, 4);
      else if (o.type === "generator")
        box(o.x - 0.47, o.y - 0.33, 0, 0.94, 0.66, 1.1, 4);
      else if (o.type === "console")
        box(o.x - 0.27, o.y - 0.28, 0, 0.54, 0.56, 1.1, 4);
    }
    const arr = new Float32Array(data),
      staticData = data,
      actorBuffer = gl.createBuffer(),
      buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW);
    const stride = 6 * 4;
    for (const [name, n, off] of [
      ["p", 3, 0],
      ["uv", 2, 12],
      ["mat", 1, 20],
    ]) {
      const loc = gl.getAttribLocation(program, name);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, n, gl.FLOAT, false, stride, off);
    }
    const eye = gl.getUniformLocation(program, "eye"),
      yaw = gl.getUniformLocation(program, "yaw"),
      pitch = gl.getUniformLocation(program, "pitch"),
      powered = gl.getUniformLocation(program, "powered"),
      torch = gl.getUniformLocation(program, "torch");
    let prev = 0;
    return {
      canvas,
      faces: arr.length / 18,
      draw(game) {
        if (!game) return;
        const now = performance.now();
        if (now - prev < 25) return;
        prev = now;
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.uniform3f(
          eye,
          game.p.x,
          game.p.y,
          (keys.ControlLeft || keys.ControlRight || keys.KeyC ? 0.53 : 0.82) +
            game.p.z,
        );
        gl.uniform1f(yaw, game.p.a);
        gl.uniform1f(pitch, game.lookPitch || 0);
        gl.uniform1f(powered, game.grid ? 1 : 0);
        gl.uniform1f(torch, game.flashlight ? 1 : 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        for (const [name, n, off] of [
          ["p", 3, 0],
          ["uv", 2, 12],
          ["mat", 1, 20],
        ])
          gl.vertexAttribPointer(
            gl.getAttribLocation(program, name),
            n,
            gl.FLOAT,
            false,
            stride,
            off,
          );
        gl.drawArrays(gl.TRIANGLES, 0, arr.length / 6);
        actorCtx.clearRect(0, 0, 960, 540);
        // V34: actual volumetric robot geometry, articulated arms/legs, powered-independent eyes.
        const ad = [];
        data = ad;
        const t = now * 0.001;
        function robotBox(x, y, z, w, d, h, m) {
          box(x, y, z, w, d, h, m);
        }
        for (let k = 0; k < game.ai.length; k++) {
          const a = game.ai[k],
            m = 5 + k,
            bob = Math.sin(t * 2.8 + k) * 0.022;
          const sway =
            Math.sin(t * 3.5 + k) * 0.17 * (a.mode === "SEARCH" ? 1.8 : 1);
          const x = a.x,
            y = a.y;
          // torso, waist, shoulders, head, snout and two independently moving arms/legs
          robotBox(x - 0.23, y - 0.17, 0.54 + bob, 0.46, 0.34, 0.58, m);
          robotBox(x - 0.19, y - 0.15, 0.43 + bob, 0.38, 0.3, 0.17, 4);
          robotBox(x - 0.26, y - 0.22, 1.14 + bob, 0.52, 0.44, 0.42, m);
          robotBox(x - 0.19, y - 0.235, 1.26 + bob, 0.12, 0.055, 0.095, 9);
          robotBox(x + 0.07, y - 0.235, 1.26 + bob, 0.12, 0.055, 0.095, 9);
          robotBox(x - 0.13, y - 0.3, 1.08 + bob, 0.26, 0.11, 0.1, 4);
          for (let side of [-1, 1]) {
            let armX = x + (side < 0 ? -0.38 : 0.24),
              legX = x + (side < 0 ? -0.2 : 0.055);
            robotBox(
              armX,
              y - 0.12 + sway * side,
              0.65 + bob,
              0.14,
              0.22,
              0.45,
              m,
            );
            robotBox(
              legX,
              y - 0.12 + sway * side * 0.65,
              0.07,
              0.14,
              0.23,
              0.42,
              m,
            );
            robotBox(
              legX - 0.025,
              y - 0.2 + sway * side * 0.65,
              0.03,
              0.19,
              0.29,
              0.1,
              4,
            );
          }
          // character silhouettes: ears, fins, crest or broad shoulder guards
          if (k === 0) {
            robotBox(x - 0.24, y - 0.1, 1.55 + bob, 0.13, 0.16, 0.23, m);
            robotBox(x + 0.11, y - 0.1, 1.55 + bob, 0.13, 0.16, 0.23, m);
          }
          if (k === 1) {
            robotBox(x - 0.34, y - 0.16, 1.2 + bob, 0.15, 0.33, 0.2, 4);
            robotBox(x + 0.2, y - 0.16, 1.2 + bob, 0.15, 0.33, 0.2, 4);
          }
          if (k === 2) {
            robotBox(x - 0.08, y - 0.1, 1.55 + bob, 0.16, 0.16, 0.23, 4);
          }
          if (k === 3) {
            robotBox(x - 0.31, y - 0.12, 1.49 + bob, 0.16, 0.18, 0.12, m);
            robotBox(x + 0.15, y - 0.12, 1.49 + bob, 0.16, 0.18, 0.12, m);
          }
        }
        data = ad;
        const dynamic = new Float32Array(ad);
        gl.bindBuffer(gl.ARRAY_BUFFER, actorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, dynamic, gl.DYNAMIC_DRAW);
        for (const [name, n, off] of [
          ["p", 3, 0],
          ["uv", 2, 12],
          ["mat", 1, 20],
        ]) {
          const loc = gl.getAttribLocation(program, name);
          gl.vertexAttribPointer(loc, n, gl.FLOAT, false, stride, off);
        }
        gl.drawArrays(gl.TRIANGLES, 0, dynamic.length / 6);
        data = staticData;
      },
    };
  }
  window.V33Renderer = { create };
})();
