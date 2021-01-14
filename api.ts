// Copyright 2021 Hugo Daniel Henriques Oliveira Gomes. All rights reserved.
// Licensed under the EUPL
import {
  GLSLVariable,
  isInputVariable,
  isOutputVariable,
  parse,
} from "https://deno.land/x/glsl_variables/parser.ts";

/**
 * This is the main entry point of the TypeScript declarations generator.
 * It produces a string with all the interfaces for the provided shader code.
 */
export function generate(
  code: string,
  {
    namespace,
    generateParseResult = true,
    generateGLSLTypes = true,
    inputsInterfaceName = "Inputs",
    outputsInterfaceName = "Outputs",
    interfaceName = "IVariables",
  }: {
    namespace: string;
    generateParseResult?: boolean;
    generateGLSLTypes?: boolean;
    inputsInterfaceName?: string;
    outputsInterfaceName?: string;
    interfaceName?: string;
  },
): string {
  let result = "";
  // Parse the code and get the variables array
  const variables = parse(code);
  // Generate structs
  const structs = variables.filter((v) => v.qualifier === "struct");
  result += structs
    .map((s) => writeInterface(capitalize(s.name), s.block))
    .join("\n");
  // Generate input variables
  const inputs = variables.filter(isInputVariable);
  result += writeInterface(inputsInterfaceName, inputs, true);
  // Generate output variables (readonly)
  const outputs = variables.filter(isOutputVariable);
  result += writeInterface(outputsInterfaceName, outputs, true);
  // Generate final interface (extending input and output interfaces)
  const ioVars = `${inputsInterfaceName},${outputsInterfaceName}`;
  result += `\nexport interface ${interfaceName} extends ${ioVars} {}`;
  // Optionally: dump the variables array into an exported const var
  if (generateParseResult) {
    result += `\nexport const vars = ${JSON.stringify(variables)};\n`;
  }
  // Optionally: write the GLSL types interface
  if (generateGLSLTypes) {
    result += glslTypes;
  }
  return `\nnamespace ${namespace} {\n${result}\n}`;
}

function writeInterface(
  name: string,
  variables: GLSLVariable[] | null,
  isExport = false,
): string {
  if (!variables) {
    console.error("The interface %s has no variables set", name);
    return "";
  }
  return (`\n${isExport ? "export " : ""}interface ${name} {\n\t${
    variables.map(writeVariable).join("\n\t")
  }\n}`);
}

function writeVariable(variable: GLSLVariable): string {
  let type: string = variable.type;
  if (type === "struct") {
    if (!variable.structName) {
      throw new Error(
        `Cannot find structName for variable: ${JSON.stringify(variable)}`,
      );
    }
    type = variable.structName;
  }
  // Block
  if (variable.type === "block") {
    if (!variable.block || variable.block.length === 0) {
      throw new Error(
        `No block array for variable: ${JSON.stringify(variable)}`,
      );
    }
    type = `{ ${variable.block.map(writeVariable).join(" ")} }`;
  }

  // Array
  if (variable.amount > 1) {
    const arrayType: string[] = [];
    if (variable.amount < 5) {
      for (let i = 0; i < variable.amount; i++) {
        arrayType.push(type);
      }
      type = `[${arrayType.join()}]`;
    } else {
      type = type + "[]";
    }
  }
  return (`${variable.name}: ${type};`);
}

function capitalize(word: string): string {
  return word[0].toUpperCase() + word.slice(1);
}

const glslTypes = `
/**
 * The list of Basic Types.
 * Taken from Section 4.1 of the GLSL 3.00 Spec, available at:
 * https://www.khronos.org/registry/OpenGL/specs/es/3.0/GLSL_ES_Specification_3.00.pdf
 **/

/** A conditional type, taking on values of true or false */
type bool = boolean;
/** A signed integer */
type int = number;
/** An unsigned integer  */
type uint = number;
/** A single floating-point scalar */
type float = number;
/** A two-component floating-point vector */
type vec2 = [number, number];
/** A three-component floating-point vector */
type vec3 = [number, number, number];
/** A four-component floating-point vector */
type vec4 = [number, number, number, number];
/** A two-component Boolean vector */
type bvec2 = [boolean, boolean];
/** A three-component Boolean vector */
type bvec3 = [boolean, boolean, boolean];
/** A four-component Boolean vector */
type bvec4 = [boolean, boolean, boolean, boolean];
/** A two-component signed integer vector */
type ivec2 = [number, number];
/** A three-component signed integer vector */
type ivec3 = [number, number, number];
/** A four-component signed integer vector */
type ivec4 = [number, number, number, number];
/** A two-component unsigned integer vector */
type uvec2 = [number, number];
/** A three-component unsigned integer vector */
type uvec3 = [number, number, number];
/** A four-component unsigned integer vector */
type uvec4 = [number, number, number, number];
/** A 2×2 floating-point matrix */
type mat2 = number[];
/** A 3×3 floating-point matrix */
type mat3 = number[];
/** A 4×4 floating-point matrix */
type mat4 = number[];
/** Same as mat2 */
type mat2x2 = number[];
/** A floating-point matrix with 2 columns and 3 rows */
type mat2x3 = number[];
/** A floating-point matrix with 2 columns and 4 rows */
type mat2x4 = number[];
/** A floating-point matrix with 3 columns and 2 rows */
type mat3x2 = number[];
/** Same as mat3 */
type mat3x3 = number[];
/** A floating-point matrix with 3 columns and 4 rows */
type mat3x4 = number[];
/** A floating-point matrix with 4 columns and 2 rows */
type mat4x2 = number[];
/** A floating-point matrix with 3 columns and 3 rows */
type mat4x3 = number[];
/** Same as mat4 */
type mat4x4 = number[];
/** A handle for accessing a 2D texture (opaque type) */
type sampler2D = number;
/** A handle for accessing a 3D texture (opaque type) */
type sampler3D = number;
/** A handle for accessing a cube mapped texture (opaque type) */
type samplerCube = number;
/** A handle for accessing a cube map depth texture with comparison (opaque 
 * type)
 **/
type samplerCubeShadow = number;
/** A handle for accessing a 2D depth texture with comparison (opaque type) */
type sampler2DShadow = number;
/** A handle for accessing a 2D array texture (opaque type) */
type sampler2DArray = number;
/** A handle for accessing a 2D array depth texture with comparison (opaque 
 * type)
 **/
type sampler2DArrayShadow = number;
/** 
 * A handle for accessing an integer 2D texture
 * Opaque Signed Integer Sampler Type
 **/
type isampler2D = number;
/** 
 * A handle for accessing an integer 3D texture
 * Opaque Signed Integer Sampler Type
 **/
type isampler3D = number;
/** 
 * A handle for accessing an integer cube mapped texture
 * Opaque Signed Integer Sampler Type
 **/
type isamplerCube = number;
/** 
 * A handle for accessing an integer 2D array texture
 * Opaque Signed Integer Sampler Type
 **/
type isampler2DArray = number;
/**
 * A handle for accessing an unsigned integer 2D texture
 * Opaque Unsigned Integer Sampler Type
 */
type usampler2D = number;
/**
 * A handle for accessing an unsigned integer 3D texture 
 * Opaque Unsigned Integer Sampler Type
 **/
type usampler3D = number;
/**
 * A handle for accessing an unsigned integer cube mapped texture
 * Opaque Unsigned Integer Sampler Type
 */
type usamplerCube = number;
/**
 * A handle for accessing an unsigned integer 2D array texture
 * Opaque Unsigned Integer Sampler Type
 */
type usampler2DArray = number;
`;
