import mammoth from "mammoth"
export const convertDocxToText = async(buffer : Buffer) : Promise<string> =>{

    const result = await mammoth.extractRawText({buffer});
    return result.value;
}