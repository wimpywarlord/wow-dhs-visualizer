'use client';

import { memo } from 'react';
import * as Flags from 'nucleo-flags';

// Map ISO 3166-1 Alpha-3 codes to nucleo-flags icon names
const isoToFlagName: Record<string, string> = {
  AFG: 'IconAfghanistan',
  ALB: 'IconAlbania',
  DZA: 'IconAlgeria',
  AND: 'IconAndorra',
  AGO: 'IconAngola',
  ATG: 'IconAntiguaBarbuda',
  ARG: 'IconArgentina',
  ARM: 'IconArmenia',
  AUS: 'IconAustralia',
  AUT: 'IconAustria',
  AZE: 'IconAzerbaijan',
  BHS: 'IconBahamas',
  BHR: 'IconBahrain',
  BGD: 'IconBangladesh',
  BRB: 'IconBarbados',
  BLR: 'IconBelarus',
  BEL: 'IconBelgium',
  BLZ: 'IconBelize',
  BEN: 'IconBenin',
  BTN: 'IconBhutan',
  BOL: 'IconBolivia',
  BIH: 'IconBosniaHerzegovina',
  BWA: 'IconBotswana',
  BRA: 'IconBrazil',
  BRN: 'IconBrunei',
  BGR: 'IconBulgaria',
  BFA: 'IconBurkinaFaso',
  BDI: 'IconBurundi',
  KHM: 'IconCambodia',
  CMR: 'IconCameroon',
  CAN: 'IconCanada',
  CPV: 'IconCapeVerde',
  CAF: 'IconCentralAfricanRepublic',
  TCD: 'IconChad',
  CHL: 'IconChile',
  CHN: 'IconChina',
  COL: 'IconColombia',
  COM: 'IconComoros',
  COG: 'IconRepublicCongo',
  COD: 'IconDemocraticRepublicCongo',
  CRI: 'IconCostaRica',
  CIV: 'IconIvoryCoast',
  HRV: 'IconCroatia',
  CUB: 'IconCuba',
  CYP: 'IconCyprus',
  CZE: 'IconCzechia',
  DNK: 'IconDenmark',
  DJI: 'IconDjibouti',
  DMA: 'IconDominica',
  DOM: 'IconDominicanRepublic',
  ECU: 'IconEcuador',
  EGY: 'IconEgypt',
  SLV: 'IconElSalvador',
  GNQ: 'IconEquatorialGuinea',
  ERI: 'IconEritrea',
  EST: 'IconEstonia',
  SWZ: 'IconEswatini',
  ETH: 'IconEthiopia',
  FJI: 'IconFiji',
  FIN: 'IconFinland',
  FRA: 'IconFrance',
  GAB: 'IconGabon',
  GMB: 'IconGambia',
  GEO: 'IconGeorgia',
  DEU: 'IconGermany',
  GHA: 'IconGhana',
  GRC: 'IconGreece',
  GRD: 'IconGrenada',
  GTM: 'IconGuatemala',
  GIN: 'IconGuinea',
  GNB: 'IconGuineaBissau',
  GUY: 'IconGuyana',
  HTI: 'IconHaiti',
  HND: 'IconHonduras',
  HKG: 'IconHongKong',
  HUN: 'IconHungary',
  ISL: 'IconIceland',
  IND: 'IconIndia',
  IDN: 'IconIndonesia',
  IRN: 'IconIran',
  IRQ: 'IconIraq',
  IRL: 'IconIreland',
  ISR: 'IconIsrael',
  ITA: 'IconItaly',
  JAM: 'IconJamaica',
  JPN: 'IconJapan',
  JOR: 'IconJordan',
  KAZ: 'IconKazakhstan',
  KEN: 'IconKenya',
  KIR: 'IconKiribati',
  PRK: 'IconNorthKorea',
  KOR: 'IconSouthKorea',
  KWT: 'IconKuwait',
  KGZ: 'IconKyrgyzstan',
  LAO: 'IconLaos',
  LVA: 'IconLatvia',
  LBN: 'IconLebanon',
  LSO: 'IconLesotho',
  LBR: 'IconLiberia',
  LBY: 'IconLibya',
  LIE: 'IconLiechtenstein',
  LTU: 'IconLithuania',
  LUX: 'IconLuxembourg',
  MAC: 'IconMacau',
  MDG: 'IconMadagascar',
  MWI: 'IconMalawi',
  MYS: 'IconMalaysia',
  MDV: 'IconMaldives',
  MLI: 'IconMali',
  MLT: 'IconMalta',
  MHL: 'IconMarshallIslands',
  MRT: 'IconMauritania',
  MUS: 'IconMauritius',
  MEX: 'IconMexico',
  FSM: 'IconMicronesia',
  MDA: 'IconMoldova',
  MCO: 'IconMonaco',
  MNG: 'IconMongolia',
  MNE: 'IconMontenegro',
  MAR: 'IconMorocco',
  MOZ: 'IconMozanbique',
  MMR: 'IconMyanmar',
  NAM: 'IconNamibia',
  NRU: 'IconNauru',
  NPL: 'IconNepal',
  NLD: 'IconNetherlands',
  NZL: 'IconNewZealand',
  NIC: 'IconNicaragua',
  NER: 'IconNiger',
  NGA: 'IconNigeria',
  MKD: 'IconNorthMacedonia',
  NOR: 'IconNorway',
  OMN: 'IconOman',
  PAK: 'IconPakistan',
  PLW: 'IconPalau',
  PSE: 'IconPalestine',
  PAN: 'IconPanama',
  PNG: 'IconPapuaNewGuinea',
  PRY: 'IconParaguay',
  PER: 'IconPeru',
  PHL: 'IconPhilippines',
  POL: 'IconPoland',
  PRT: 'IconPortugal',
  QAT: 'IconQatar',
  ROU: 'IconRomania',
  RUS: 'IconRussia',
  RWA: 'IconRwanda',
  KNA: 'IconSaintKittsNevis',
  LCA: 'IconSaintLucia',
  VCT: 'IconSaintVincentGrenadines',
  WSM: 'IconSamoa',
  SMR: 'IconSanMarino',
  STP: 'IconSaoTomePrincipe',
  SAU: 'IconSaudiArabia',
  SEN: 'IconSenegal',
  SRB: 'IconSerbia',
  SYC: 'IconSeychelles',
  SLE: 'IconSierraLeone',
  SGP: 'IconSingapore',
  SVK: 'IconSlovakia',
  SVN: 'IconSlovenia',
  SLB: 'IconSolomonIslands',
  SOM: 'IconSomalia',
  ZAF: 'IconSouthAfrica',
  SSD: 'IconSouthSudan',
  ESP: 'IconSpain',
  LKA: 'IconSriLanka',
  SDN: 'IconSudan',
  SUR: 'IconSuriname',
  SWE: 'IconSweden',
  CHE: 'IconSwitzerland',
  SYR: 'IconSyria',
  TWN: 'IconTaiwan',
  TJK: 'IconTajikistan',
  TZA: 'IconTanzania',
  THA: 'IconThailand',
  TLS: 'IconEastTimor',
  TGO: 'IconTogo',
  TON: 'IconTonga',
  TTO: 'IconTrinidadTobago',
  TUN: 'IconTunisia',
  TUR: 'IconTurkey',
  TKM: 'IconTurkmenistan',
  TUV: 'IconTuvalu',
  UGA: 'IconUganda',
  UKR: 'IconUkraine',
  ARE: 'IconUnitedArabEmirates',
  GBR: 'IconUnitedKingdom',
  USA: 'IconUnitedStates',
  URY: 'IconUruguay',
  UZB: 'IconUzbekistan',
  VUT: 'IconVanuatu',
  VAT: 'IconVaticanCity',
  VEN: 'IconVenezuela',
  VNM: 'IconVietnam',
  YEM: 'IconYemen',
  ZMB: 'IconZambia',
  ZWE: 'IconZimbabwe',
  XKX: 'IconKosovo',
  // Territories
  PRI: 'IconPuertoRico',
  GUM: 'IconGuam',
  VIR: 'IconUnitedStatesVirginIslands',
  ASM: 'IconAmericanSamoa',
  GLP: 'IconGuadeloupe',
  MTQ: 'IconMartinique',
  GUF: 'IconFrenchGuiana',
  REU: 'IconReunion',
  NCL: 'IconNewCaledonia',
  PYF: 'IconFrenchPolynesia',
  BMU: 'IconBermuda',
  CYM: 'IconCaymanIslands',
  VGB: 'IconBritishVirginIslands',
  TCA: 'IconTurksAndCaicosIslands',
  AIA: 'IconAnguilla',
  MSR: 'IconMontserrat',
  FLK: 'IconFalklandIslands',
  GIB: 'IconGibraltar',
  SHN: 'IconSaintHelena',
  ABW: 'IconAruba',
  CUW: 'IconCuracao',
  SXM: 'IconSintMaarten',
  GRL: 'IconGreenland',
  FRO: 'IconFaroeIslands',
  IMN: 'IconIsleOfMan',
  JEY: 'IconJersey',
  GGY: 'IconGuernsey',
  COK: 'IconCookIslands',
  NIU: 'IconNiue',
};

interface CountryFlagProps {
  countryCode: string;
  size?: number;
  className?: string;
}

const CountryFlagComponent = ({
  countryCode,
  size = 24,
  className = '',
}: CountryFlagProps) => {
  const flagName = isoToFlagName[countryCode];

  if (!flagName) {
    // Fallback: show a globe icon or placeholder
    return (
      <div
        className={`flex items-center justify-center rounded-full bg-muted text-muted-foreground ${className}`}
        style={{ width: size, height: size }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-3/4 w-3/4"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      </div>
    );
  }

  // Get the flag component from nucleo-flags
  const FlagComponent = (Flags as Record<string, React.ComponentType<{ size?: number; className?: string }>>)[flagName];

  if (!FlagComponent) {
    return (
      <div
        className={`flex items-center justify-center rounded-full bg-muted text-muted-foreground ${className}`}
        style={{ width: size, height: size }}
      >
        ?
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center overflow-hidden rounded-full bg-muted ${className}`}
      style={{ width: size, height: size }}
    >
      <div className="flex items-center justify-center" style={{ transform: 'scale(1.8)' }}>
        <FlagComponent size={size} />
      </div>
    </div>
  );
};

export const CountryFlag = memo(CountryFlagComponent);
