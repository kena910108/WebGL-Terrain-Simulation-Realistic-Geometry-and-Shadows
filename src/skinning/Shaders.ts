export const floorVSText = `#version 300 es
    precision mediump float;

    in vec4 aVertPos;
    in vec3 aVertNormal;

    out vec2 v_texcoord; 
    out vec4 wPos;
    out vec3 vertnor;
    out vec4 lightSpacePos;

    uniform mat4 uWorld;
    uniform mat4 uView;
    uniform mat4 uProj;
    uniform float half_width;
    uniform mat4 uLightSpaceMatrix;

    uniform sampler2D dis_texture;


    void main () {
        wPos = aVertPos;
        vertnor = aVertNormal;
        v_texcoord = aVertPos.xz;
        vec2 texcoord = vec2(mod(v_texcoord.x + half_width, 2.0 * half_width) / (2.0 * half_width),
                             mod(v_texcoord.y + half_width, 2.0 * half_width) / (2.0 * half_width));

        //float height = texture(dis_texture, texcoord).r;
        
        vec4 worldPosition = uWorld * vec4( aVertPos.x , aVertPos.y, aVertPos.z , 1);
        gl_Position = uProj * uView * uWorld * vec4( aVertPos.x , aVertPos.y, aVertPos.z , 1);
        lightSpacePos = uLightSpaceMatrix * worldPosition;
    }
`;

export const floorFSText = `#version 300 es
    precision mediump float;

    in vec2 v_texcoord;
    in vec4 wPos;
    in vec3 vertnor;
    in vec4 lightSpacePos;
    out vec4 outColor;

    uniform vec4 uLightPos;
    uniform mat4 uWorld;
    uniform mat4 uView;
    uniform mat4 uProj;
    uniform mat4 uSurface;
    uniform float half_width;
    uniform float whole_width;
    uniform float enable_normal;
    uniform float enable_shadow;

    uniform sampler2D nor_texture;
    uniform sampler2D dis_texture;
    uniform sampler2D u_texture;
    uniform sampler2D uShadowMap;

    void main() { // Notice the fliped direction will affect the normal vector direction

        vec2 texcoord = vec2(mod(v_texcoord.x + half_width, 2.0 * half_width) / (2.0 * half_width),
                             mod(v_texcoord.y + half_width, 2.0 * half_width) / (2.0 * half_width));

        vec4 normal = texture(nor_texture, texcoord) * 2.0 - 1.0;
        //normal = normalize(vec4(normal.x, normal.z, normal.y, 0) * 2.0 - 1.0);
        normal = normalize(vec4(normal.x, normal.z, -normal.y, 0)) + vec4(vertnor, 0.0) - vec4(0.0, 1.0, 0.0, 0.0);
        normal = enable_normal > 0.0 ? normal: vec4(vertnor, 0.0);
        vec4 lightDirection = uLightPos - wPos;
        float dot_nl = dot(normalize(lightDirection.xyz), normalize(normal.xyz));
  	    dot_nl = clamp(dot_nl, 0.0, 1.0) * 0.9 + 0.1;
        
        vec3 projCoords = lightSpacePos.xyz / lightSpacePos.w;
        projCoords = projCoords * 0.5 + vec3(0.5, 0.5, 0.5 - 0.0003);
        float closestDepth = texture(uShadowMap, projCoords.xy).r;
        float currentDepth = projCoords.z;
        float shadow = enable_shadow > 0.0 ? (currentDepth > closestDepth ? 0.8 : 0.0) : 0.0;
        
        vec3 color = texture(u_texture, texcoord).xyz;
        outColor = vec4(color*dot_nl*(1.0-shadow)*1.5, 1.0);
    }
`;

export const depthVSText = `
    precision mediump float;

    attribute vec4 vertPosition;


    uniform mat4 InverseUi[64];
    uniform mat4 Di[64];
    uniform mat4 uView;
    uniform mat4 uProj;

    uniform mat4 mWorld;
    uniform mat4 uLightSpaceMatrix;

    void main () {

        vec4 worldPosition = mWorld * vertPosition;
       gl_Position = uLightSpaceMatrix * worldPosition;
    }
`;

export const depthFSText = `
    precision mediump float;

    void main () {
    }
`;
