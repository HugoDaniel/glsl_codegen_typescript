// Copyright 2021 Hugo Daniel Henriques Oliveira Gomes. All rights reserved.
// Licensed under the EUPL
import { generate } from "./api.ts";
import { assert } from "https://deno.land/std@0.83.0/testing/asserts.ts";

Deno.test(
  "Can generate interface declarations for structs",
  () => {
    const shader = `
      struct Material
      {
          vec3 ambient;
          vec3 diffuse;
          vec3 specular;
          float shininess;
      };
      `;
    const t = generate(
      shader,
      "MyShader",
      { generateGLSLTypes: false },
    );
    assert(t.includes("interface Material"), "Interface missing");
    assert(t.includes("ambient: vec3;"), "Attribute missing");
    assert(t.includes("diffuse: vec3;"), "Attribute missing");
    assert(t.includes("specular: vec3;"), "Attribute missing");
    assert(t.includes("shininess: float;"), "Attribute missing");
  },
);

Deno.test(
  "Can generate shader interfaces for input and output variables",
  () => {
    const shader = `
    #version 300 es

    precision highp float;
    in vec2 v_texcoord;
    
    uniform sampler2D u_texture;
    
    out vec4 outColor;
    
    void main() {
      outColor = texture(u_texture, v_texcoord);
    }`;
    const t = generate(
      shader,
      "MyShader",
      { generateGLSLTypes: false },
    );
    assert(t.includes("namespace MyShader"), "Namespace missing");
    assert(t.includes("export interface Inputs"), "Inputs Interface missing");
    assert(t.includes("export interface Outputs"), "Outputs Interface missing");
    assert(t.includes("v_texcoord: vec2;"), "Attribute missing");
    assert(t.includes("u_texture: sampler2D;"), "Attribute missing");
    assert(t.includes("outColor: vec4;"), "Attribute missing");
    assert(
      t.includes(
        "export interface Variables extends Inputs,Outputs {}",
      ),
      "Final interface missing",
    );
  },
);

Deno.test(
  "Can generate interface declarations for uniform blocks",
  () => {
    const shader = `
    layout (std140) uniform Matrices
    {
        mat4 projection;
        mat4 view;
    } some_local_name;`;
    const t = generate(
      shader,
      "MyShader",
      { generateGLSLTypes: false },
    );
    assert(t.includes("interface Inputs"), "Interface missing");
    assert(
      t.includes("Matrices: { projection: mat4; view: mat4; };"),
      "Attribute missing",
    );
  },
);

Deno.test(
  "Can produce arrays",
  () => {
    const shader = `
    #version 300 es
    // this is unrealistic but serves the purpose of testing array generation
    in vec4 a_position[12];

    void main() {
      gl_Position = a_position;
    }
    `;
    const t = generate(
      shader,
      "MyShader",
      { generateGLSLTypes: false },
    );
    assert(t.includes("interface Inputs"), "Interface missing");
    assert(t.includes("a_position: vec4[];"), "Attribute missing");
  },
);

Deno.test(
  "Uses array tuples if the variable array has a small dimension",
  () => {
    const shader = `
    #version 300 es
    in vec4 a_position[4];

    void main() {
      gl_Position = a_position;
    }
    `;
    const t = generate(
      shader,
      "MyShader",
      { generateGLSLTypes: false },
    );
    assert(t.includes("interface Inputs"), "Interface missing");
    assert(
      t.includes("a_position: [vec4,vec4,vec4,vec4];"),
      "Attribute missing",
    );
  },
);

Deno.test(
  "Uses struct declarations in uniform blocks",
  () => {
    const shader = `
        #version 300 es
    
        precision highp float;
        struct Material
        {
            vec3 ambient;
            vec3 diffuse;
            vec3 specular;
            float shininess;
        };
        
        uniform PerScene
        {
            Material material;
        } u_perScene;  
        
        struct MaterialAlternative{
            float shininess;
            float specularReflection;
            float diffuseReflection;
            float opacity;
        };
        
        layout(std140) uniform MaterialBuffer{
          MaterialAlternative materials[12];
          bool useCommon;
            Material common[12];
        };
        
        void main() {
          outColor = texture(u_texture, v_texcoord);
        }
            `;
    const t = generate(
      shader,
      "MyShader",
      { generateGLSLTypes: false },
    );
    assert(t.includes("interface Inputs"), "Interface missing");
    assert(
      t.includes("PerScene: { material: Material; };"),
      "Attribute missing",
    );
    assert(
      t.includes(
        "MaterialBuffer: { materials: MaterialAlternative[]; useCommon: bool; common: Material[]; };",
      ),
      "Attribute missing",
    );
  },
);

Deno.test(
  "Generates an array of the variables parsed.",
  () => {
    const shader = `
      #version 300 es
      in vec4 a_position;
  
      void main() {
        gl_Position = a_position;
      }
      `;
    const t = generate(
      shader,
      "MyShader",
      { generateGLSLTypes: false },
    );
    assert(
      t.includes("export const vars = [{"),
      "Interface missing",
    );
  },
);

Deno.test(
  "Generates the declaration for GLSL types.",
  () => {
    const shader = `
      #version 300 es
      in vec4 a_position;
  
      void main() {
        gl_Position = a_position;
      }
      `;
    const t = generate(
      shader,
      "MyShader",
      { generateGLSLTypes: true },
    );
    assert(t.includes("type vec2 = [number, number];"));
    assert(t.includes("type vec3 = [number, number, number];"));
    assert(t.includes("type vec4 = [number, number, number, number];"));
    assert(t.includes("type float = number;"));
    assert(t.includes("type mat2 = number[];"));
    assert(t.includes("type mat3 = number[];"));
    assert(t.includes("type mat4 = number[];"));
    assert(t.includes("type sampler2D = number;"));
  },
);
