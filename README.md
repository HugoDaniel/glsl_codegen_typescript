# glsl_codegen_typescript

Welcome!

This repository is the home for a Deno package that provides the API to generate
TypeScript declarations for the input/output variables of GLSL shader code
(WebGL 2.0 only).

## API

It provides a single function as the API:

`generate(glslCode: string, namespace: string, options: object);`

It receives the GLSL code string and the namespace to wrap the type declaration.
The namespace can be anything you want, it is meant to distinguish different
shaders that can share variables (e.g. a vertex shader its corresponding
fragment shader).

With the namespace you can chose the base name for these declarations so that
they don't collide with other previously declared variable names.

The parsing of the GLSL variables from the code string is done with the
[glsl_variables](https://deno.land/x/glsl_variables) package.

### Options

The generation of TypeScript declarations can be customized through the
following options (the 3rd argument of `generate()`):

```typescript
{
    generateParseResult?: boolean;
    generateGLSLTypes?: boolean;
    interfaceName?: string;
    inputsInterfaceName?: string;
    outputsInterfaceName?: string;
}
```

- `generateParseResult`

  If set then a `namespace.vars` array will be written with the output from
  the parse result (the output of the `parse()` function from the [glsl_variables](https://deno.land/x/glsl_variables])).
  **Default: true**

- `generateGLSLTypes`

  If set then the output will contain the type declarations for the GLSL base
  types. All interfaces depend on these and they are used extensively in the
  output string of `generate()`. Please make sure to produce them _once_ and once
  **only** throughout your shader generation.
  **Default: true**

- `interfaceName`

  The final exported interface name. This is an empty interface that extends
  both the input variables interface and the output variables interface. It
  contains all I/O variables found on the shader and is intended to be the main
  thing to be imported from the produced declarations.
  **Default: "Variables"**

- `inputsInterfaceName`

  The interface name to be used for all input variable declarations. This
  interface is then extended by `interfaceName` to include also the output
  variables interface.
  **Default: "Inputs"**

- `outputsInterfaceName`

  The interface name to be used for all output variable declarations. This
  interface is then extended by `interfaceName` to include also the input
  variables interface.
  **Default: "Outputs"**

### Usage

Import it in your CLI tool to produce TypeScript a declarations file for your
shaders. It can also be used at runtime to produce the JavaScript list of
variables found in a GLSL text string (if the `generateParseResult` is `true`).

Either way, a common usage can be said to be something along these lines:

```typescript
import { generate } from "./api.ts";

const shader = `
    #version 300 es

    precision highp float;
    in vec2 v_texcoord;
    
    uniform sampler2D u_texture;
    
    out vec4 outColor;
    
    void main() {
      outColor = texture(u_texture, v_texcoord);
    }`;

const decls = generate(shader, "FragmentShader", { generateGLSLTypes: false });

// Then do what you want with the declaration string on `decls`. Append other
// shader declarations, or just write it to a file, etc...
```
