/**
 * Name filter data, lightly obfuscated with ROT13 so this file isn't a wall of slurs. Decode with
 * `rot13` in names.ts. Format: `<mode>:<ROT13 word>` — mode c = substring after lookalike mapping
 * and repeated-letter collapse, l = substring with runs limited to two letters (for roots whose
 * collapse would hit innocent words, e.g. a double S or double O), x = the whole name, r suffix =
 * also checked reversed. ALLOW masks innocent words that contain a blocked root (the Scunthorpe
 * problem). Edit with care and run `tests/unit/names.test.ts`.
 */
export const BLOCK_ROT13 =
  'cr:SHPX c:SHX l:SPX c:ZBSB l:ZGUES x:FGSH x:TGSB c:JGS cr:FUVG x:FUG cr:PHAG x:PAG c:OVGPU c:OVPU c:OVNGPU c:OGPU c:JUBER c:FYHG c:FXNAX c:GJNG c:JNAX l:CEVPX x:CEVX l:QVPX x:QPX x:QVX x:QVXF lr:PBPX x:PBX c:CRAVF c:INTVAN c:CHFFL x:CFFL c:PYVG c:QVYQB c:OBARE c:OBYYBPX l:OBBO x:GVG x:GVGF x:GVGGL x:GVGGVR x:GVGGVRF x:PHZ c:PHZFU l:WVMM c:WVFZ c:FCHAX c:CBEA x:FRK x:FRKL c:BETNFZ x:BETL x:BETVRF c:ZVYS c:UBEAL l:ENCR c:ENCVFG c:CRQB c:CNRQB c:VAPRFG cr:AVTTRE c:AVTTN l:ATTE l:ATTN l:AVOON c:AVTYRG cr:SNTTBG x:SNT x:SNTF l:STG x:QLXR l:XVXR x:FCVP x:FCVPF x:FCVX c:PUVAX l:TBBX l:PBBA c:JRGONPX c:GENAAL x:CNXV x:CNXVF c:ERGNEQ x:UBZB c:ORNARE c:ANMV c:UVGYRE x:XXX x:URVY c:NEFR x:NFF x:NFFRF x:NMM l:NFFU l:NFFJ l:NFFS l:QHZONFF l:WNPXNFF c:ONFGNEQ l:CVFF c:GHEQ c:QBHPUR x:XLF x:NANY x:NAHF c:CHGN x:CHGB c:ZVREQN c:CRAQRWB c:PNOEBA c:IRETN x:PHYB c:ZREQR c:PBAANEQ c:FNYBCR c:RAPHYR c:FPURVF c:SBGMR c:JVPUFRE x:UHER c:NEFPU l:SVPX l:PNMMB c:FGEBAMB l:INSSN c:ZVAPUVN c:PNENYUB c:OHPRGN x:XNAXRE c:OYLNG x:FHXN c:CVMQN c:PUHW c:XHEJN';

export const ALLOW_ROT13 =
  'PBPXYR CRNPBPX UNAPBPX PBPBBA ENPPBBA GLPBBA TENCR QENCR FPENCR FRENCR GENCRM CNENCRG GBECRQB GUBEAL CNEFR NEFRA PBNEFR UBNEFR FJNAXL CEVPXY QVPXRAF SHPUFVN SHXHBXN ANMVZ ANMVN ANMVE ERTVAN QVPR FUVVGR PHFUVGR SHPHF FGHEQL URNEFR ENPBBA PNAPRE SVPXYR';
