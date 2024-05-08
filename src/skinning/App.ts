import { Debugger } from "../lib/webglutils/Debugging.js";
import {
  CanvasAnimation,
} from "../lib/webglutils/CanvasAnimation.js";
import { Floor } from "../lib/webglutils/Floor.js";
import {GUI} from "./Gui.js";
import {
  floorFSText,
  floorVSText, 
  depthVSText, 
  depthFSText
} from "./Shaders.js";
import { Mat4, Vec4, Vec3 } from "../lib/TSM.js";
import { RenderPass } from "../lib/webglutils/RenderPass.js";

var height_map = new Uint8ClampedArray(4096 * 4096);
export class SkinningAnimation extends CanvasAnimation {
  private gui: GUI;
  /* Floor Rendering Info */
  public floor: Floor;
  private floorRenderPass: RenderPass;
  
  private depthRenderPass: RenderPass;
  
  /* Global Rendering Info */
  private lightPosition: Vec4;
  private orbit_angle: number = 0.0;
  private orbitRadius: number = 300.0;
  private backgroundColor: Vec4;
  private value_noise: number;

  private canvas2d: HTMLCanvasElement;

  private button_normal: HTMLButtonElement;
  private button_shadow: HTMLButtonElement;
  private button_subdiv: HTMLButtonElement;

  private slider_disp: HTMLInputElement;
  private slider_disp_text: HTMLSpanElement;

  private slider_size: HTMLInputElement;
  private slider_size_text: HTMLSpanElement;

  private slider_valnoi: HTMLInputElement;
  private slider_valnoi_text: HTMLSpanElement;

  private slider_initsub: HTMLInputElement;
  private slider_initsub_text: HTMLSpanElement;

  public HL: number = 0;
  public keyframeTextures: WebGLTexture[];
  public texLoc: WebGLUniformLocation;
  public projectionMatrix = Mat4.orthographic(-1, 1, -1, 1, -1, 1);

  /* Shadow Mapping */
  private shadowMapTexture: WebGLTexture;
  private shadowMapFrameBuffer: WebGLFramebuffer;
  private lightSpaceMatrix: Mat4;

  private size = 90;
  private enable_normal = 1.0;
  private enable_shadow = 1.0;
  private init_subdivision = 3;

  constructor(canvas: HTMLCanvasElement) {
    super(canvas);

    this.canvas2d = document.getElementById("textCanvas") as HTMLCanvasElement;

    this.ctx = Debugger.makeDebugContext(this.ctx);
    let gl = this.ctx;

    this.value_noise = 20.0;
    this.floor = new Floor(2.0, this.size, 45.0, this.value_noise, 6.0);
    this.loadImageAndExtractPixels('/static/assets/skinning/dis.png', () => {
      this.TerrainGeneration(this.value_noise, 6.0);
    });

    this.button_normal = document.getElementById('SetNormalButton') as HTMLButtonElement;
    this.button_normal.addEventListener('click', () => { this.setNormal(); });

    this.button_shadow = document.getElementById('SetShadowButton') as HTMLButtonElement;
    this.button_shadow.addEventListener('click', () => { this.setShadow(); });

    this.slider_disp = document.getElementById('maxDispHeight') as HTMLInputElement;
    this.slider_disp_text = document.getElementById('maxDispHeightValue') as HTMLSpanElement;
    this.slider_disp.addEventListener('input', () => { this.setDispHeight(); });

    this.slider_size = document.getElementById('TerrainSize') as HTMLInputElement;
    this.slider_size_text = document.getElementById('TerrainSizeValue') as HTMLSpanElement;
    this.slider_size.addEventListener('input', () => { this.SetSize(); });

    this.slider_valnoi = document.getElementById('ValueNoiseHeight') as HTMLInputElement;
    this.slider_valnoi_text = document.getElementById('ValueNoiseHeightValue') as HTMLSpanElement;
    this.slider_valnoi.addEventListener('input', () => { this.SetValueNoiseHeight(); });

    this.slider_initsub = document.getElementById('initsubdivision') as HTMLInputElement;
    this.slider_initsub_text = document.getElementById('initsubdivisionValue') as HTMLSpanElement;
    this.slider_initsub.addEventListener('input', () => { this.SetInitSub(); });

    this.button_subdiv = document.getElementById('LoopSubdivision') as HTMLButtonElement;
    this.button_subdiv.addEventListener('click', () => { this.LoopSubdivision(); });

    this.floorRenderPass = new RenderPass( gl, floorVSText, floorFSText);
    this.depthRenderPass = new RenderPass( gl, depthVSText, depthFSText);

    this.floorRenderPass.addTextureMap("diff.png", "dis.png", "normal.png");

    this.gui = new GUI(this.canvas2d, this);
    this.lightPosition = new Vec4([0, 300, 0, 1]);
    this.backgroundColor = new Vec4([0.0, 0.37254903, 0.37254903, 1.0]);

    this.initFloor();
    
    this.initDepth();

    gl.getExtension("WEBGL_depth_texture");
    this.shadowMapTexture = gl.createTexture() as WebGLTexture;
    gl.bindTexture(gl.TEXTURE_2D, this.shadowMapTexture);

    // Try creating a depth texture with different formats
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, 8192, 8192, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT, null);

    // Set up texture parameters
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.shadowMapFrameBuffer = gl.createFramebuffer() as WebGLFramebuffer;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowMapFrameBuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.shadowMapTexture, 0);
    gl.clear(gl.DEPTH_BUFFER_BIT);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  public reset(): void {
      this.gui.reset();
  }



  public initDepth(): void {
    const gl: WebGLRenderingContext = this.ctx;

    this.depthRenderPass = new RenderPass( this.ctx, depthVSText, depthFSText);

    this.depthRenderPass.setIndexBufferData(this.floor.indicesFlat());

    this.depthRenderPass.addAttribute("vertPosition",
      4,
      this.ctx.FLOAT,
      false,
      4 * Float32Array.BYTES_PER_ELEMENT,
      0,
      undefined,
      this.floor.positionsFlat()
    );
    this.depthRenderPass.addUniform("mWorld",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(loc, false, new Float32Array(new Mat4().setIdentity().all()));
      });
    
    this.depthRenderPass.addUniform("uProj",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.projMatrix().all()));
    });
    this.depthRenderPass.addUniform("uView",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.viewMatrix().all()));
    });
    this.depthRenderPass.addUniform("uLightSpaceMatrix",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(loc, false, this.lightSpaceMatrix.all());
      });

    this.depthRenderPass.setDrawData(gl.TRIANGLES,  this.floor.indicesFlat().length, gl.UNSIGNED_INT, 0);
    this.depthRenderPass.setup();
  }
 
  public apply_displacement(): void{
    this.floor.apply_displacement(height_map);
  }

  public TerrainGeneration(max_height: number, max_dis: number): void {
    console.log(max_height, max_dis);
    this.floor = new Floor(2.0, this.size, 45.0, max_height, max_dis);
    
    // Processing Terrain Meshes
    for(let i = 0; i < this.init_subdivision; i ++){
      this.floor.subdivision(0.0);
    }
    this.floor.apply_value_noise();
    for(let i = 0; i < 3; i ++){
      this.floor.subdivision(0.2);
    }
    this.floor.apply_displacement(height_map);

    this.initFloor();
    this.initDepth();
  }

  public initFloor(): void {
    this.floorRenderPass.setIndexBufferData(this.floor.indicesFlat());
    this.floorRenderPass.addAttribute("aVertPos",
      4,
      this.ctx.FLOAT,
      false,
      4 * Float32Array.BYTES_PER_ELEMENT,
      0,
      undefined,
      this.floor.positionsFlat()
    );

    this.floorRenderPass.addAttribute("aVertNormal",
      4,
      this.ctx.FLOAT,
      false,
      3 * Float32Array.BYTES_PER_ELEMENT,
      0,
      undefined,
      this.floor.get_vertex_normals()
    );
    this.floorRenderPass.addUniform("uShadowMap",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniform1i(loc, 3);
      });
    this.floorRenderPass.addUniform("uLightSpaceMatrix",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(loc, false, this.lightSpaceMatrix.all());
      });

    this.floorRenderPass.addUniform("half_width",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniform1f(loc, this.floor.getTextureWidth());
    });

    this.floorRenderPass.addUniform("enable_normal",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniform1f(loc, this.enable_normal);
    });

    this.floorRenderPass.addUniform("enable_shadow",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniform1f(loc, this.enable_shadow);
    });
    
    this.floorRenderPass.addUniform("uLightPos",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniform4fv(loc, this.lightPosition.xyzw);
    });
    this.floorRenderPass.addUniform("uWorld",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(loc, false, new Float32Array(Mat4.identity.all()));
    });
    this.floorRenderPass.addUniform("uSurface",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(loc, false, new Float32Array(Mat4.iden().rotate(-Math.PI/4.0, new Vec3([1,0,0])).all()));
    });
    this.floorRenderPass.addUniform("uProj",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.projMatrix().all()));
    });
    this.floorRenderPass.addUniform("uView",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.viewMatrix().all()));
    });
    this.floorRenderPass.addUniform("uProjInv",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.projMatrix().inverse().all()));
    });
    this.floorRenderPass.addUniform("uViewInv",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.viewMatrix().inverse().all()));
    });

    this.floorRenderPass.setDrawData(this.ctx.TRIANGLES, this.floor.indicesFlat().length, this.ctx.UNSIGNED_INT, 0);
    this.floorRenderPass.setup();

  }


  public loadImageAndExtractPixels(url, callback) {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = function() {
        // Create a canvas element dynamically
        const canv = document.createElement('canvas');
        const ctx2d = canv.getContext('2d');
        if (ctx2d){
          // Set canvas dimensions to the image dimensions
          canv.width = img.width;
          canv.height = img.height;

          // Draw the image onto the canvas
          ctx2d.drawImage(img, 0, 0);
        
          // Get pixel data from the canvas
          const imageData = ctx2d.getImageData(0, 0, canv.width, canv.height);
          const pixels = imageData.data; // Pixels is a Uint8ClampedArray
          const redValues = new Uint8ClampedArray(canv.width * canv.height);
          for (let i = 0; i < pixels.length; i += 4) {
            redValues[i / 4] = pixels[i];
          }
          height_map = redValues;
          callback();
        }
    };

    img.onerror = function() {
        console.error('Failed to load the image.');
    };

    // Set the source of the image
    img.src = url;
  }


  public createFrameBuffer(gl: WebGLRenderingContext, targetTexture: WebGLTexture): WebGLFramebuffer {
    // Create and bind the framebuffer
    const fb = gl.createFramebuffer() as WebGLFramebuffer;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);

    // attach the texture as the first color attachment
    const attachmentPoint = gl.COLOR_ATTACHMENT0;
    const level = 0;
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, targetTexture, level);
    return fb;
  }


  public light_orbit(): void{
    this.orbit_angle += 0.2 * 0.05;

    const x = this.orbitRadius * Math.cos(this.orbit_angle);
    const z = this.orbitRadius * Math.sin(this.orbit_angle);
    this.lightPosition = new Vec4([x, this.lightPosition.y, z, 1]);
  }
  public draw(): void {
    this.light_orbit();
    // Drawing
    const gl: WebGLRenderingContext = this.ctx;
    const bg: Vec4 = this.backgroundColor;
    gl.clearColor(bg.r, bg.g, bg.b, bg.a);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    gl.frontFace(gl.CCW);
    gl.cullFace(gl.BACK);

    // Set up light space matrix
    const lightProjection = Mat4.orthographic(300, -300, -300, 300, 50, 600);
    const lightView = Mat4.lookAt(new Vec3(this.lightPosition.xyz), new Vec3([0, 30, 0]), new Vec3([0, 1, 0]));
    this.lightSpaceMatrix = lightProjection.multiply(lightView);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowMapFrameBuffer);
    gl.viewport(0, 0, 8192, 8192);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    this.depthRenderPass.draw();

    gl.bindFramebuffer(gl.FRAMEBUFFER, null); // null is the default frame buffer
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Bind the shadow map texture
    this.ctx.activeTexture(gl.TEXTURE3);
    this.ctx.bindTexture(gl.TEXTURE_2D, this.shadowMapTexture);
    if(this.floor.positions().length > 5){
      this.drawScene(0, 0, 1200, 850); 
    }
  }

  private drawScene(x: number, y: number, width: number, height: number): void {
    const gl: WebGLRenderingContext = this.ctx;
    gl.viewport(x, y, width, height);

    this.floorRenderPass.draw();
  }

  public getGUI(): GUI {
    return this.gui;
  }
  
  public setNormal(): void {
    this.enable_normal = 1 - this.enable_normal;
  }
  public setShadow(): void {
    this.enable_shadow = 1 - this.enable_shadow;
  }
  public setDispHeight():void{
    this.slider_disp_text.textContent = this.slider_disp.value;
    this.floor.max_dis = Number(this.slider_disp.value);
    this.TerrainGeneration(this.value_noise, this.floor.max_dis);
  }
  public LoopSubdivision():void{
    this.floor.subdivision(0.2);
    this.initFloor();
    this.initDepth();
  }
  public SetSize():void{
    this.size = Math.floor(Number(this.slider_size.value) / 45) * 45;
    this.slider_size_text.textContent = String(this.size);
    this.TerrainGeneration(this.value_noise, this.floor.max_dis);
  }
  public SetValueNoiseHeight():void{
    this.slider_valnoi_text.textContent = this.slider_valnoi.value;
    this.value_noise = Number(this.slider_valnoi.value);
    this.TerrainGeneration(this.value_noise, this.floor.max_dis);
  }
  public SetInitSub(): void{
    console.log(this.slider_initsub.value);
    this.slider_initsub_text.textContent = String(Math.pow(4, Number(this.slider_initsub.value) + 4));
    this.init_subdivision = Number(this.slider_initsub.value);
    this.TerrainGeneration(this.value_noise, this.floor.max_dis);
  }
}

export function initializeCanvas(): void {
  const canvas = document.getElementById("glCanvas") as HTMLCanvasElement;
  /* Start drawing */
  const canvasAnimation: SkinningAnimation = new SkinningAnimation(canvas);
  canvasAnimation.start();
}
