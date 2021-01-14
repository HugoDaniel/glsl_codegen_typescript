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
 * 
 * Two main interfaces are produced for the shader input and output variables.
 * These two interfaces are then exported in a single interface named by
 * the `interfaceName` option.
 * 
 * By default it also generates typescript types for common GLSL variable types.
 * It also exports the variables array produced by the shader code parsing.
 * 
 * All exports are wrapped in a namespace. This namespace is one of the
 * required arguments.
 */
export function generate(
  code: string,
  namespace: string,
  {
    generateParseResult = true,
    generateGLSLTypes = true,
    inputsInterfaceName = "Inputs",
    outputsInterfaceName = "Outputs",
    interfaceName = "Variables",
  }: {
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
  // Everything is wrapped in a final namespace
  return `\nnamespace ${namespace} {\n${result}\n}`;
}

/**
 * This function produces the `interface...` strings for an array of
 * `GLSLVariable` 's.
 * 
 * It works by calling `writeVariable` on each item on the `variables` array.
 * The results are joined with `\n\t` and wrapped with the `interface ... { }` 
 * final string.
 * 
 * It can optionally declare an interface as an export.
 */
function writeInterface(
  name: string,
  variables: GLSLVariable[] | null,
  isExport = false,
): string {
  // Check if the array is valid
  if (!variables || variables.length === 0) {
    console.error("The interface %s has no variables set", name);
    return "";
  }
  // Transform each GLSLVariable in the `variables` array into a string, join
  // these strings with the terminator "\n\t", and wrap them with the
  // final interface string. This final wrapper can be suffixed with the word
  // "export" if the `isExport` argument is true.
  return (`\n${isExport ? "export " : ""}interface ${name} {\n\t${
    variables.map(writeVariable).join("\n\t")
  }\n}`);
}

/**
 * Transforms a `GLSLVariable` object into a string that is useful to be placed
 * in typescript type declarations.
 * 
 * For this generator purposes this is a string that can be fit inside interface
 * declarations. Something with a format like: "name type;".
 * 
 * This name is kept as is from the variable, and for the most part this
 * function deals with creating the correct string to the type part.
 * 
 * The type can range from a simple GLSL type (see `glslTypes`), a struct name,
 * or even a new full object (in the case of uniform buffer objects).
 * 
 * When writing a new full object as type, this function calls itself
 * recursively on all variables found in the `block` array. It then wraps the
 * produced strings in "{ }" characters.
 */
function writeVariable(variable: GLSLVariable): string {
  // The type starts as being the same as the one from the variable.
  // If no other changes are needed, then this is the final type.
  // What follows is a series of checks to see if there are changes to be
  // made to this type.
  let type: string = variable.type;
  if (type === "struct") {
    // A struct variable must always have the `structName` defined.
    if (!variable.structName) {
      throw new Error(
        `Cannot find structName for variable: ${JSON.stringify(variable)}`,
      );
    }
    // If this variable uses a struct as the type, then use the struct name
    // directly as the type.
    type = variable.structName;
  }
  // Variables can be declared inside uniform block's. In this case the type
  // is set as "block" and the list of variables in this block are available at
  // the `variable.block` attribute.
  if (variable.type === "block") {
    // There must be an array with at least one item defined at the `block`
    // attribute.
    if (!variable.block || variable.block.length === 0) {
      throw new Error(
        `No block array for variable: ${JSON.stringify(variable)}`,
      );
    }
    // Recursively call itself to build the variable string lines, at the end
    // merge them in a single string (space separated) and wrap the string
    // inside { } characters.
    type = `{ ${variable.block.map(writeVariable).join(" ")} }`;
  }

  // A variable is a an array (e.g. `myvar vec[4];`) if it has a value bigger
  // than 1 in `variable.amount`.
  if (variable.amount > 1) {
    // Produce a tuple string if the array has up to 4 elements.
    // Tuple declarations have the shape: [vec4, vec4, vec4], instead of the
    // common vec4[] array declaration. This is useful because it allows
    // TypeScript to type-check that the array is being set with the correct
    // amount of items (in some situations only, but still it can help).
    const arrayType: string[] = [];
    if (variable.amount < 5) {
      // The idea here is to repeat the type `variable.amount` times inside an
      // empty array. And then join these repeated strings in a single string
      // with each value separated by ", ".
      for (let i = 0; i < variable.amount; i++) {
        arrayType.push(type);
      }
      type = `[${arrayType.join()}]`; // `.join()` merges with ", " by default.
    } else {
      // Just prefix the type with [] (e.g `myvar vec4[];`).
      type = type + "[]";
    }
  }
  // The final string produced is the one works for TypeScript interfaces and
  // object type declarations.
  return (`${variable.name}: ${type};`);
}

/**
 * Turns the first character of a string into an upper case character.
 * This is not an immediate operation in JS because strings are immutable.
 * It creates a new string by appending the new upper case character with
 * a copy of the rest of the original string.
 */
function capitalize(word: string): string {
  return word[0].toUpperCase() + word.slice(1);
}

/**
 * This variable holds the string with all the GLSL types.
 * It is included by default on the generated type declarations.
 * 
 * The interfaces produced by this API always make use of these variables.
 * Make sure this gets included once when producing type declarations with this
 * API.
 **/
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
