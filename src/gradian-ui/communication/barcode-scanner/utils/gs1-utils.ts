/**
 * GS1 barcode parsing and validation utilities.
 * Reference: https://ref.gs1.org/ai/
 * Parser logic adapted from GS1 BarcodeParser (e.g. PeterBrockfeld/BarcodeParser).
 */

export interface GS1ParsedElement {
  ai: string;
  dataTitle: string;
  data: string | number | Date;
  unit: string;
  /** Raw value as in the barcode (YYMMDD for dates, ISO+digits for currency, etc.) for display in (01)xxx format. */
  rawValue?: string;
}

export interface GS1ParseResult {
  codeName: string;
  parsedCodeItems: GS1ParsedElement[];
}

const FNC_CHAR = String.fromCharCode(29);

/** Literal \F (backslash-F) is treated as FNC1 group separator. */
const FNC1_ESCAPE = "\\F";

/**
 * Normalizes barcode input: replaces literal \F with FNC1 (ASCII 29) so
 * pasted strings like 01...10ABC123\F3932... are parsed correctly.
 */
function normalizeFNC1(barcode: string): string {
  return barcode.split(FNC1_ESCAPE).join(FNC_CHAR);
}

/**
 * Sample GS1 barcode string for testing (e.g. paste in Handheld mode).
 * Contains: ]C1 (GS1-128), 01 GTIN, 17 expiry, 10 batch, 3932 price EUR, 3103 net weight kg, 3922 price, 421 ship-to postal.
 */
export const SAMPLE_GS1_BARCODE =
  "]C1" +
  "01" + "04012345678901" + FNC_CHAR +
  "17" + "150129" + FNC_CHAR +
  "10" + "ABC123" + FNC_CHAR +
  "3932" + "978" + "4711" + FNC_CHAR +
  "3103" + "000525" + FNC_CHAR +
  "3922" + "4711" + FNC_CHAR +
  "421" + "276" + "49716";

function cleanCodestring(stringToClean: string): string {
  let firstChar = stringToClean.slice(0, 1);
  while (firstChar === FNC_CHAR) {
    stringToClean = stringToClean.slice(1, stringToClean.length);
    firstChar = stringToClean.slice(0, 1);
  }
  return stringToClean;
}

function parseFloatingPoint(stringToParse: string, numberOfFractionals: number): number {
  const offset = stringToParse.length - numberOfFractionals;
  const auxString =
    stringToParse.slice(0, offset) + "." + stringToParse.slice(offset, stringToParse.length);
  const auxFloat = parseFloat(auxString);
  if (Number.isNaN(auxFloat)) throw new Error("GS1_INVALID_NUM");
  return auxFloat;
}

interface IdentifiedResult {
  element: GS1ParsedElement;
  codestring: string;
}

function identifyAI(
  codestring: string,
  codestringLength: number,
  lotLen?: string
): IdentifiedResult {
  const firstNumber = codestring.slice(0, 1);
  const secondNumber = codestring.slice(1, 2);
  let thirdNumber = "";
  let fourthNumber = "";
  let codestringToReturn = "";
  let elementToReturn: GS1ParsedElement = {
    ai: "",
    dataTitle: "",
    data: "",
    unit: "",
  };

  function parseDate(ai: string, title: string): void {
    const offSet = ai.length;
    const dateYYMMDD = codestring.slice(offSet, offSet + 6);
    elementToReturn = { ai, dataTitle: title, data: new Date(), unit: "", rawValue: dateYYMMDD };
    (elementToReturn.data as Date).setHours(0, 0, 0, 0);
    let yearAsNumber = parseInt(dateYYMMDD.slice(0, 2), 10);
    if (Number.isNaN(yearAsNumber)) throw new Error("GS1_INVALID_DATE_YEAR");
    const monthAsNumber = parseInt(dateYYMMDD.slice(2, 4), 10) - 1;
    if (Number.isNaN(monthAsNumber)) throw new Error("GS1_INVALID_DATE_MONTH");
    const dayAsNumber = parseInt(dateYYMMDD.slice(4, 6), 10);
    if (Number.isNaN(dayAsNumber)) throw new Error("GS1_INVALID_DATE_DAY");
    if (yearAsNumber > 50) {
      yearAsNumber += 1900;
    } else {
      yearAsNumber += 2000;
    }
    (elementToReturn.data as Date).setFullYear(yearAsNumber, monthAsNumber, dayAsNumber);
    codestringToReturn = codestring.slice(offSet + 6, codestringLength);
  }

  function parseFixedLength(ai: string, title: string, length: number): void {
    const raw = codestring.slice(ai.length, length + ai.length);
    elementToReturn = { ai, dataTitle: title, data: raw, unit: "", rawValue: raw };
    codestringToReturn = codestring.slice(length + ai.length, codestringLength);
  }

  function parseVariableLength(ai: string, title: string): void {
    elementToReturn = { ai, dataTitle: title, data: "", unit: "" };
    const offSet = ai.length;
    const posOfFNC = codestring.indexOf(FNC_CHAR);
    let raw: string;
    if (posOfFNC === -1) {
      if (ai === "10" && lotLen !== undefined && lotLen.trim() !== "") {
        const len = parseInt(lotLen, 10);
        if (!Number.isNaN(len)) {
          raw = codestring.slice(offSet, len + offSet);
          elementToReturn.data = raw;
          codestringToReturn = codestring.replace("10" + raw, "");
        } else {
          raw = codestring.slice(offSet, codestringLength);
          elementToReturn.data = raw;
          codestringToReturn = "";
        }
      } else {
        raw = codestring.slice(offSet, codestringLength);
        elementToReturn.data = raw;
        codestringToReturn = "";
      }
    } else {
      raw = codestring.slice(offSet, posOfFNC);
      elementToReturn.data = raw;
      codestringToReturn = codestring.slice(posOfFNC + 1, codestringLength);
    }
    elementToReturn.rawValue = raw;
  }

  function parseFixedLengthMeasure(
    aiStem: string,
    fourthNum: string,
    title: string,
    unit: string
  ): void {
    const fullAi = aiStem + fourthNum;
    const offSet = aiStem.length + 1;
    const numberPart = codestring.slice(offSet, offSet + 6);
    elementToReturn = { ai: fullAi, dataTitle: title, data: 0, unit, rawValue: numberPart };
    elementToReturn.data = parseFloatingPoint(numberPart, parseInt(fourthNum, 10));
    codestringToReturn = codestring.slice(offSet + 6, codestringLength);
  }

  function parseVariableLengthMeasure(
    aiStem: string,
    fourthNum: string,
    title: string,
    unit: string
  ): void {
    const fullAi = aiStem + fourthNum;
    elementToReturn = { ai: fullAi, dataTitle: title, data: 0, unit };
    const offSet = aiStem.length + 1;
    const posOfFNC = codestring.indexOf(FNC_CHAR);
    const numberOfDecimals = parseInt(fourthNum, 10);
    let numberPart: string;
    if (posOfFNC === -1) {
      numberPart = codestring.slice(offSet, codestringLength);
      codestringToReturn = "";
    } else {
      numberPart = codestring.slice(offSet, posOfFNC);
      codestringToReturn = codestring.slice(posOfFNC + 1, codestringLength);
    }
    elementToReturn.rawValue = numberPart;
    elementToReturn.data = parseFloatingPoint(numberPart, numberOfDecimals);
  }

  function parseVariableLengthWithISONumbers(aiStem: string, fourthNum: string, title: string): void {
    const fullAi = aiStem + fourthNum;
    elementToReturn = { ai: fullAi, dataTitle: title, data: 0, unit: "" };
    const offSet = aiStem.length + 1;
    const posOfFNC = codestring.indexOf(FNC_CHAR);
    const numberOfDecimals = parseInt(fourthNum, 10);
    let isoPlusNumbers: string;
    if (posOfFNC === -1) {
      isoPlusNumbers = codestring.slice(offSet, codestringLength);
      codestringToReturn = "";
    } else {
      isoPlusNumbers = codestring.slice(offSet, posOfFNC);
      codestringToReturn = codestring.slice(posOfFNC + 1, codestringLength);
    }
    elementToReturn.rawValue = isoPlusNumbers;
    const numberPart = isoPlusNumbers.slice(3, isoPlusNumbers.length);
    elementToReturn.data = parseFloatingPoint(numberPart, numberOfDecimals);
    elementToReturn.unit = isoPlusNumbers.slice(0, 3);
  }

  function parseVariableLengthWithISOChars(aiStem: string, title: string): void {
    elementToReturn = { ai: aiStem, dataTitle: title, data: "", unit: "" };
    const offSet = aiStem.length;
    const posOfFNC = codestring.indexOf(FNC_CHAR);
    let isoPlusNumbers: string;
    if (posOfFNC === -1) {
      isoPlusNumbers = codestring.slice(offSet, codestringLength);
      codestringToReturn = "";
    } else {
      isoPlusNumbers = codestring.slice(offSet, posOfFNC);
      codestringToReturn = codestring.slice(posOfFNC + 1, codestringLength);
    }
    elementToReturn.rawValue = isoPlusNumbers;
    elementToReturn.data = isoPlusNumbers.slice(3, isoPlusNumbers.length);
    elementToReturn.unit = isoPlusNumbers.slice(0, 3);
  }

  switch (firstNumber) {
    case "0":
      switch (secondNumber) {
        case "0":
          parseFixedLength("00", "SSCC", 18);
          break;
        case "1":
          parseFixedLength("01", "GTIN", 14);
          break;
        case "2":
          parseFixedLength("02", "CONTENT", 14);
          break;
        default:
          throw new Error("GS1_INVALID_AI_0x");
      }
      break;
    case "1":
      switch (secondNumber) {
        case "0":
          parseVariableLength("10", "BATCH/LOT");
          break;
        case "1":
          parseDate("11", "PROD DATE");
          break;
        case "2":
          parseDate("12", "DUE DATE");
          break;
        case "3":
          parseDate("13", "PACK DATE");
          break;
        case "5":
          parseDate("15", "BEST BEFORE or BEST BY");
          break;
        case "6":
          parseDate("16", "SELL BY");
          break;
        case "7":
          parseDate("17", "USE BY OR EXPIRY");
          break;
        default:
          throw new Error("GS1_INVALID_AI_1x");
      }
      break;
    case "2":
      switch (secondNumber) {
        case "0":
          parseFixedLength("20", "VARIANT", 2);
          break;
        case "1":
          parseVariableLength("21", "SERIAL");
          break;
        case "4":
          thirdNumber = codestring.slice(2, 3);
          switch (thirdNumber) {
            case "0":
              parseVariableLength("240", "ADDITIONAL ID");
              break;
            case "1":
              parseVariableLength("241", "CUST. PART NO.");
              break;
            case "2":
              parseVariableLength("242", "MTO VARIANT");
              break;
            case "3":
              parseVariableLength("243", "PCN");
              break;
            default:
              throw new Error("GS1_INVALID_AI_24x");
          }
          break;
        case "5":
          thirdNumber = codestring.slice(2, 3);
          switch (thirdNumber) {
            case "0":
              parseVariableLength("250", "SECONDARY SERIAL");
              break;
            case "1":
              parseVariableLength("251", "REF. TO SOURCE");
              break;
            case "3":
              parseVariableLength("253", "GDTI");
              break;
            case "4":
              parseVariableLength("254", "GLN EXTENSION COMPONENT");
              break;
            case "5":
              parseVariableLength("255", "GCN");
              break;
            default:
              throw new Error("GS1_INVALID_AI_25x");
          }
          break;
        default:
          throw new Error("GS1_INVALID_AI_2x");
      }
      break;
    case "3":
      switch (secondNumber) {
        case "0":
          parseVariableLength("30", "VAR. COUNT");
          break;
        case "1":
          thirdNumber = codestring.slice(2, 3);
          fourthNumber = codestring.slice(3, 4);
          switch (thirdNumber) {
            case "0":
              parseFixedLengthMeasure("310", fourthNumber, "NET WEIGHT (kg)", "KGM");
              break;
            case "1":
              parseFixedLengthMeasure("311", fourthNumber, "LENGTH (m)", "MTR");
              break;
            case "2":
              parseFixedLengthMeasure("312", fourthNumber, "WIDTH (m)", "MTR");
              break;
            case "3":
              parseFixedLengthMeasure("313", fourthNumber, "HEIGHT (m)", "MTR");
              break;
            case "4":
              parseFixedLengthMeasure("314", fourthNumber, "AREA (m2)", "MTK");
              break;
            case "5":
              parseFixedLengthMeasure("315", fourthNumber, "NET VOLUME (l)", "LTR");
              break;
            case "6":
              parseFixedLengthMeasure("316", fourthNumber, "NET VOLUME (m3)", "MTQ");
              break;
            default:
              throw new Error("GS1_INVALID_AI_31x");
          }
          break;
        case "2":
          thirdNumber = codestring.slice(2, 3);
          fourthNumber = codestring.slice(3, 4);
          switch (thirdNumber) {
            case "0":
              parseFixedLengthMeasure("320", fourthNumber, "NET WEIGHT (lb)", "LBR");
              break;
            case "1":
              parseFixedLengthMeasure("321", fourthNumber, "LENGTH (i)", "INH");
              break;
            case "2":
              parseFixedLengthMeasure("322", fourthNumber, "LENGTH (f)", "FOT");
              break;
            case "3":
              parseFixedLengthMeasure("323", fourthNumber, "LENGTH (y)", "YRD");
              break;
            case "4":
              parseFixedLengthMeasure("324", fourthNumber, "WIDTH (i)", "INH");
              break;
            case "5":
              parseFixedLengthMeasure("325", fourthNumber, "WIDTH (f)", "FOT");
              break;
            case "6":
              parseFixedLengthMeasure("326", fourthNumber, "WIDTH (y)", "YRD");
              break;
            case "7":
              parseFixedLengthMeasure("327", fourthNumber, "HEIGHT (i)", "INH");
              break;
            case "8":
              parseFixedLengthMeasure("328", fourthNumber, "HEIGHT (f)", "FOT");
              break;
            case "9":
              parseFixedLengthMeasure("329", fourthNumber, "HEIGHT (y)", "YRD");
              break;
            default:
              throw new Error("GS1_INVALID_AI_32x");
          }
          break;
        case "3":
          thirdNumber = codestring.slice(2, 3);
          fourthNumber = codestring.slice(3, 4);
          switch (thirdNumber) {
            case "0":
              parseFixedLengthMeasure("330", fourthNumber, "GROSS WEIGHT (kg)", "KGM");
              break;
            case "1":
              parseFixedLengthMeasure("331", fourthNumber, "LENGTH (m), log", "MTR");
              break;
            case "2":
              parseFixedLengthMeasure("332", fourthNumber, "WIDTH (m), log", "MTR");
              break;
            case "3":
              parseFixedLengthMeasure("333", fourthNumber, "HEIGHT (m), log", "MTR");
              break;
            case "4":
              parseFixedLengthMeasure("334", fourthNumber, "AREA (m2), log", "MTK");
              break;
            case "5":
              parseFixedLengthMeasure("335", fourthNumber, "VOLUME (l), log", "LTR");
              break;
            case "6":
              parseFixedLengthMeasure("336", fourthNumber, "VOLUME (m3), log", "MTQ");
              break;
            case "7":
              parseFixedLengthMeasure("337", fourthNumber, "KG PER m²", "28");
              break;
            default:
              throw new Error("GS1_INVALID_AI_33x");
          }
          break;
        case "4":
          thirdNumber = codestring.slice(2, 3);
          fourthNumber = codestring.slice(3, 4);
          switch (thirdNumber) {
            case "0":
              parseFixedLengthMeasure("340", fourthNumber, "GROSS WEIGHT (lb)", "LBR");
              break;
            case "1":
              parseFixedLengthMeasure("341", fourthNumber, "LENGTH (i), log", "INH");
              break;
            case "2":
              parseFixedLengthMeasure("342", fourthNumber, "LENGTH (f), log", "FOT");
              break;
            case "3":
              parseFixedLengthMeasure("343", fourthNumber, "LENGTH (y), log", "YRD");
              break;
            case "4":
              parseFixedLengthMeasure("344", fourthNumber, "WIDTH (i), log", "INH");
              break;
            case "5":
              parseFixedLengthMeasure("345", fourthNumber, "WIDTH (f), log", "FOT");
              break;
            case "6":
              parseFixedLengthMeasure("346", fourthNumber, "WIDTH (y), log", "YRD");
              break;
            case "7":
              parseFixedLengthMeasure("347", fourthNumber, "HEIGHT (i), log", "INH");
              break;
            case "8":
              parseFixedLengthMeasure("348", fourthNumber, "HEIGHT (f), log", "FOT");
              break;
            case "9":
              parseFixedLengthMeasure("349", fourthNumber, "HEIGHT (y), log", "YRD");
              break;
            default:
              throw new Error("GS1_INVALID_AI_34x");
          }
          break;
        case "5":
          thirdNumber = codestring.slice(2, 3);
          fourthNumber = codestring.slice(3, 4);
          switch (thirdNumber) {
            case "0":
              parseFixedLengthMeasure("350", fourthNumber, "AREA (i2)", "INK");
              break;
            case "1":
              parseFixedLengthMeasure("351", fourthNumber, "AREA (f2)", "FTK");
              break;
            case "2":
              parseFixedLengthMeasure("352", fourthNumber, "AREA (y2)", "YDK");
              break;
            case "3":
              parseFixedLengthMeasure("353", fourthNumber, "AREA (i2), log", "INK");
              break;
            case "4":
              parseFixedLengthMeasure("354", fourthNumber, "AREA (f2), log", "FTK");
              break;
            case "5":
              parseFixedLengthMeasure("355", fourthNumber, "AREA (y2), log", "YDK");
              break;
            case "6":
              parseFixedLengthMeasure("356", fourthNumber, "NET WEIGHT (t)", "APZ");
              break;
            case "7":
              parseFixedLengthMeasure("357", fourthNumber, "NET VOLUME (oz)", "ONZ");
              break;
            default:
              throw new Error("GS1_INVALID_AI_35x");
          }
          break;
        case "6":
          thirdNumber = codestring.slice(2, 3);
          fourthNumber = codestring.slice(3, 4);
          switch (thirdNumber) {
            case "0":
              parseFixedLengthMeasure("360", fourthNumber, "NET VOLUME (q)", "QT");
              break;
            case "1":
              parseFixedLengthMeasure("361", fourthNumber, "NET VOLUME (g)", "GLL");
              break;
            case "2":
              parseFixedLengthMeasure("362", fourthNumber, "VOLUME (q), log", "QT");
              break;
            case "3":
              parseFixedLengthMeasure("363", fourthNumber, "VOLUME (g), log", "GLL");
              break;
            case "4":
              parseFixedLengthMeasure("364", fourthNumber, "VOLUME (i3)", "INQ");
              break;
            case "5":
              parseFixedLengthMeasure("365", fourthNumber, "VOLUME (f3)", "FTQ");
              break;
            case "6":
              parseFixedLengthMeasure("366", fourthNumber, "VOLUME (y3)", "YDQ");
              break;
            case "7":
              parseFixedLengthMeasure("367", fourthNumber, "VOLUME (i3), log", "INQ");
              break;
            case "8":
              parseFixedLengthMeasure("368", fourthNumber, "VOLUME (f3), log", "FTQ");
              break;
            case "9":
              parseFixedLengthMeasure("369", fourthNumber, "VOLUME (y3), log", "YDQ");
              break;
            default:
              throw new Error("GS1_INVALID_AI_36x");
          }
          break;
        case "7":
          parseVariableLength("37", "COUNT");
          break;
        case "9":
          thirdNumber = codestring.slice(2, 3);
          fourthNumber = codestring.slice(3, 4);
          switch (thirdNumber) {
            case "0":
              parseVariableLengthMeasure("390", fourthNumber, "AMOUNT", "");
              break;
            case "1":
              parseVariableLengthWithISONumbers("391", fourthNumber, "AMOUNT");
              break;
            case "2":
              parseVariableLengthMeasure("392", fourthNumber, "PRICE", "");
              break;
            case "3":
              parseVariableLengthWithISONumbers("393", fourthNumber, "PRICE");
              break;
            default:
              throw new Error("GS1_INVALID_AI_39x");
          }
          break;
        default:
          throw new Error("GS1_INVALID_AI_3x");
      }
      break;
    case "4":
      switch (secondNumber) {
        case "0":
          thirdNumber = codestring.slice(2, 3);
          switch (thirdNumber) {
            case "0":
              parseVariableLength("400", "ORDER NUMBER");
              break;
            case "1":
              parseVariableLength("401", "GINC");
              break;
            case "2":
              parseVariableLength("402", "GSIN");
              break;
            case "3":
              parseVariableLength("403", "ROUTE");
              break;
            default:
              throw new Error("GS1_INVALID_AI_40x");
          }
          break;
        case "1":
          thirdNumber = codestring.slice(2, 3);
          switch (thirdNumber) {
            case "0":
              parseFixedLength("410", "SHIP TO LOC", 13);
              break;
            case "1":
              parseFixedLength("411", "BILL TO", 13);
              break;
            case "2":
              parseFixedLength("412", "PURCHASE FROM", 13);
              break;
            case "3":
              parseFixedLength("413", "SHIP FOR LOC", 13);
              break;
            default:
              throw new Error("GS1_INVALID_AI_41x");
          }
          break;
        case "2":
          thirdNumber = codestring.slice(2, 3);
          switch (thirdNumber) {
            case "0":
              parseVariableLength("420", "SHIP TO POST");
              break;
            case "1":
              parseVariableLengthWithISOChars("421", "SHIP TO POST");
              break;
            case "2":
              parseFixedLength("422", "ORIGIN", 3);
              break;
            case "3":
              parseVariableLength("423", "COUNTRY - INITIAL PROCESS.");
              break;
            case "4":
              parseFixedLength("424", "COUNTRY - PROCESS.", 3);
              break;
            case "5":
              parseFixedLength("425", "COUNTRY - DISASSEMBLY", 3);
              break;
            case "6":
              parseFixedLength("426", "COUNTRY – FULL PROCESS", 3);
              break;
            case "7":
              parseVariableLength("427", "ORIGIN SUBDIVISION");
              break;
            default:
              throw new Error("GS1_INVALID_AI_42x");
          }
          break;
        default:
          throw new Error("GS1_INVALID_AI_4x");
      }
      break;
    case "7":
      switch (secondNumber) {
        case "0":
          thirdNumber = codestring.slice(2, 3);
          fourthNumber = codestring.slice(3, 4);
          switch (thirdNumber) {
            case "0":
              switch (fourthNumber) {
                case "1":
                  parseVariableLength("7001", "NSN");
                  break;
                case "2":
                  parseVariableLength("7002", "MEAT CUT");
                  break;
                case "3":
                  parseVariableLength("7003", "EXPIRY TIME");
                  break;
                case "4":
                  parseVariableLength("7004", "ACTIVE POTENCY");
                  break;
                default:
                  throw new Error("GS1_INVALID_AI_700x");
              }
              break;
            case "3":
              parseVariableLengthWithISOChars("703" + fourthNumber, "PROCESSOR # " + fourthNumber);
              break;
            default:
              throw new Error("GS1_INVALID_AI_70x");
          }
          break;
        case "1":
          thirdNumber = codestring.slice(2, 3);
          switch (thirdNumber) {
            case "0":
              parseVariableLength("710", "NHRN PZN");
              break;
            case "1":
              parseVariableLength("711", "NHRN CIP");
              break;
            case "2":
              parseVariableLength("712", "NHRN CN");
              break;
            case "3":
              parseVariableLength("713", "NHRN DRN");
              break;
            default:
              throw new Error("GS1_INVALID_AI_71x");
          }
          break;
        default:
          throw new Error("GS1_INVALID_AI_7x");
      }
      break;
    case "8":
      switch (secondNumber) {
        case "0":
          thirdNumber = codestring.slice(2, 3);
          fourthNumber = codestring.slice(3, 4);
          switch (thirdNumber) {
            case "0":
              switch (fourthNumber) {
                case "1":
                  parseVariableLength("8001", "DIMENSIONS");
                  break;
                case "2":
                  parseVariableLength("8002", "CMT No");
                  break;
                case "3":
                  parseVariableLength("8003", "GRAI");
                  break;
                case "4":
                  parseVariableLength("8004", "GIAI");
                  break;
                case "5":
                  parseVariableLength("8005", "PRICE PER UNIT");
                  break;
                case "6":
                  parseVariableLength("8006", "GCTIN");
                  break;
                case "7":
                  parseVariableLength("8007", "IBAN");
                  break;
                case "8":
                  parseVariableLength("8008", "PROD TIME");
                  break;
                default:
                  throw new Error("GS1_INVALID_AI_800x");
              }
              break;
            case "1":
              switch (fourthNumber) {
                case "0":
                  parseVariableLength("8010", "CPID");
                  break;
                case "1":
                  parseVariableLength("8011", "CPID SERIAL");
                  break;
                case "7":
                  parseVariableLength("8017", "GSRN - PROVIDER");
                  break;
                case "8":
                  parseVariableLength("8018", "GSRN - RECIPIENT");
                  break;
                case "9":
                  parseVariableLength("8019", "SRIN");
                  break;
                default:
                  throw new Error("GS1_INVALID_AI_801x");
              }
              break;
            case "2":
              switch (fourthNumber) {
                case "0":
                  parseVariableLength("8020", "REF No");
                  break;
                default:
                  throw new Error("GS1_INVALID_AI_802x");
              }
              break;
            default:
              throw new Error("GS1_INVALID_AI_80x");
          }
          break;
        case "1":
          thirdNumber = codestring.slice(2, 3);
          fourthNumber = codestring.slice(3, 4);
          switch (thirdNumber) {
            case "0":
              switch (fourthNumber) {
                case "0":
                  parseVariableLength("8100", "-");
                  break;
                case "1":
                  parseVariableLength("8101", "-");
                  break;
                case "2":
                  parseVariableLength("8102", "-");
                  break;
                default:
                  throw new Error("GS1_INVALID_AI_810x");
              }
              break;
            case "1":
              switch (fourthNumber) {
                case "0":
                  parseVariableLength("8110", "-");
                  break;
                default:
                  throw new Error("GS1_INVALID_AI_811x");
              }
              break;
            default:
              throw new Error("GS1_INVALID_AI_81x");
          }
          break;
        case "2":
          thirdNumber = codestring.slice(2, 3);
          switch (thirdNumber) {
            case "0":
              parseVariableLength("8200", "PRODUCT URL");
              break;
            default:
              throw new Error("GS1_INVALID_AI_82x");
          }
          break;
        default:
          throw new Error("GS1_INVALID_AI_8x");
      }
      break;
    case "9":
      switch (secondNumber) {
        case "0":
          parseVariableLength("90", "INTERNAL");
          break;
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
        case "8":
        case "9":
          parseVariableLength("9" + secondNumber, "INTERNAL");
          break;
        default:
          throw new Error("GS1_INVALID_AI_9x");
      }
      break;
    default:
      throw new Error("GS1_INVALID_AI");
  }

  return {
    element: elementToReturn,
    codestring: cleanCodestring(codestringToReturn),
  };
}

/**
 * Parses a GS1 barcode string and returns structured Application Identifier data.
 * Supports optional symbology prefixes (e.g. ]d2 for Data Matrix, ]C1 for GS1-128).
 * @param barcode Raw barcode content (may include FNC1 / group separator char 29)
 * @param lotLen Optional fixed length for AI 10 (batch/lot) when not FNC1-terminated
 * @returns Parsed result with codeName and parsedCodeItems
 * @throws On invalid AI or malformed data
 */
export function parseGS1(barcode: string, lotLen?: string): GS1ParseResult {
  barcode = normalizeFNC1(barcode);
  const barcodelength = barcode.length;
  const answer: GS1ParseResult = { codeName: "", parsedCodeItems: [] };
  let restOfBarcode: string;
  const symbologyIdentifier = barcode.slice(0, 3);

  switch (symbologyIdentifier) {
    case "]C1":
      answer.codeName = "GS1-128";
      restOfBarcode = barcode.slice(3, barcodelength);
      break;
    case "]e0":
      answer.codeName = "GS1 DataBar";
      restOfBarcode = barcode.slice(3, barcodelength);
      break;
    case "]e1":
    case "]e2":
      answer.codeName = "GS1 Composite";
      restOfBarcode = barcode.slice(3, barcodelength);
      break;
    case "]d2":
      answer.codeName = "GS1 DataMatrix";
      restOfBarcode = barcode.slice(3, barcodelength);
      break;
    case "]Q3":
      answer.codeName = "GS1 QR Code";
      restOfBarcode = barcode.slice(3, barcodelength);
      break;
    default:
      answer.codeName = "";
      restOfBarcode = barcode;
      break;
  }

  while (restOfBarcode.length > 0) {
    const firstElement = identifyAI(restOfBarcode, restOfBarcode.length, lotLen);
    restOfBarcode = firstElement.codestring;
    answer.parsedCodeItems.push(firstElement.element);
  }

  return answer;
}

/**
 * Returns true if the barcode string is valid GS1 and parses to at least one AI.
 * Safe to call with any string; catches parse errors and returns false.
 */
export function isGS1Valid(barcode: string): boolean {
  if (typeof barcode !== "string" || barcode.length < 2) return false;
  try {
    const result = parseGS1(barcode);
    return result.parsedCodeItems.length > 0;
  } catch {
    return false;
  }
}
