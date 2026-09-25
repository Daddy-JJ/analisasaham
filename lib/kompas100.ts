/**
 * Universe Konstituen Indeks Kompas 100 (Bursa Efek Indonesia / BEI)
 * Saham-saham berkapitalisasi pasar besar dan likuiditas transaksi tinggi.
 */
export interface Kompas100Stock {
  ticker: string;
  name: string;
  sector: string;
}

export const KOMPAS_100_UNIVERSE: Kompas100Stock[] = [
  // Financials & Major Banks
  { ticker: 'BBCA', name: 'Bank Central Asia Tbk', sector: 'Financials' },
  { ticker: 'BBRI', name: 'Bank Rakyat Indonesia Tbk', sector: 'Financials' },
  { ticker: 'BMRI', name: 'Bank Mandiri Tbk', sector: 'Financials' },
  { ticker: 'BBNI', name: 'Bank Negara Indonesia Tbk', sector: 'Financials' },
  { ticker: 'BBTN', name: 'Bank Tabungan Negara Tbk', sector: 'Financials' },
  { ticker: 'BDMN', name: 'Bank Danamon Indonesia Tbk', sector: 'Financials' },
  { ticker: 'BNGA', name: 'Bank CIMB Niaga Tbk', sector: 'Financials' },
  { ticker: 'BRIS', name: 'Bank Syariah Indonesia Tbk', sector: 'Financials' },
  { ticker: 'BTPS', name: 'Bank BTPN Syariah Tbk', sector: 'Financials' },
  { ticker: 'ARTO', name: 'Bank Jago Tbk', sector: 'Financials' },
  { ticker: 'MEGA', name: 'Bank Mega Tbk', sector: 'Financials' },

  // Energy & Coal
  { ticker: 'ADRO', name: 'Alamtri Resources Indonesia Tbk', sector: 'Energy' },
  { ticker: 'PTBA', name: 'Bukit Asam Tbk', sector: 'Energy' },
  { ticker: 'ITMG', name: 'Indo Tambangraya Megah Tbk', sector: 'Energy' },
  { ticker: 'INDY', name: 'Indika Energy Tbk', sector: 'Energy' },
  { ticker: 'PGAS', name: 'Perusahaan Gas Negara Tbk', sector: 'Energy' },
  { ticker: 'MEDC', name: 'Medco Energi Internasional Tbk', sector: 'Energy' },
  { ticker: 'ENRG', name: 'Energi Mega Persada Tbk', sector: 'Energy' },
  { ticker: 'AKRA', name: 'AKR Corporindo Tbk', sector: 'Energy' },
  { ticker: 'BUMI', name: 'Bumi Resources Tbk', sector: 'Energy' },
  { ticker: 'HRUM', name: 'Harum Energy Tbk', sector: 'Energy' },
  { ticker: 'ABMM', name: 'ABM Investama Tbk', sector: 'Energy' },
  { ticker: 'DOID', name: 'Delta Dunia Makmur Tbk', sector: 'Energy' },
  { ticker: 'ELSA', name: 'Elnusa Tbk', sector: 'Energy' },

  // Minerals, Metals & Mining
  { ticker: 'ANTM', name: 'Aneka Tambang Tbk', sector: 'Basic Materials' },
  { ticker: 'INCO', name: 'Vale Indonesia Tbk', sector: 'Basic Materials' },
  { ticker: 'MDKA', name: 'Merdeka Copper Gold Tbk', sector: 'Basic Materials' },
  { ticker: 'MBMA', name: 'Merdeka Battery Materials Tbk', sector: 'Basic Materials' },
  { ticker: 'TINS', name: 'Timah Tbk', sector: 'Basic Materials' },
  { ticker: 'NCKL', name: 'Trimegah Bangun Persada Tbk', sector: 'Basic Materials' },
  { ticker: 'BRMS', name: 'Bumi Resources Minerals Tbk', sector: 'Basic Materials' },
  { ticker: 'AMMN', name: 'Amman Mineral Internasional Tbk', sector: 'Basic Materials' },

  // Consumer Non-Cyclicals & Healthcare
  { ticker: 'ICBP', name: 'Indofood CBP Sukses Makmur Tbk', sector: 'Consumer Non-Cyclicals' },
  { ticker: 'INDF', name: 'Indofood Sukses Makmur Tbk', sector: 'Consumer Non-Cyclicals' },
  { ticker: 'MYOR', name: 'Mayora Indah Tbk', sector: 'Consumer Non-Cyclicals' },
  { ticker: 'UNVR', name: 'Unilever Indonesia Tbk', sector: 'Consumer Non-Cyclicals' },
  { ticker: 'CMRY', name: 'Cisarua Mountain Dairy Tbk', sector: 'Consumer Non-Cyclicals' },
  { ticker: 'AMRT', name: 'Sumber Alfaria Trijaya Tbk', sector: 'Consumer Non-Cyclicals' },
  { ticker: 'MIDI', name: 'Midi Utama Indonesia Tbk', sector: 'Consumer Non-Cyclicals' },
  { ticker: 'CPIN', name: 'Charoen Pokphand Indonesia Tbk', sector: 'Consumer Non-Cyclicals' },
  { ticker: 'JPFA', name: 'Japfa Comfeed Indonesia Tbk', sector: 'Consumer Non-Cyclicals' },
  { ticker: 'KLBF', name: 'Kalbe Farma Tbk', sector: 'Healthcare' },
  { ticker: 'MIKA', name: 'Mitra Keluarga Karyasehat Tbk', sector: 'Healthcare' },
  { ticker: 'HEAL', name: 'Medikaloka Hermina Tbk', sector: 'Healthcare' },
  { ticker: 'SILO', name: 'Siloam International Hospitals Tbk', sector: 'Healthcare' },
  { ticker: 'SIDO', name: 'Industri Jamu Sido Muncul Tbk', sector: 'Healthcare' },

  // Consumer Cyclicals, Retail & Auto
  { ticker: 'ASII', name: 'Astra International Tbk', sector: 'Industrials' },
  { ticker: 'AUTO', name: 'Astra Otoparts Tbk', sector: 'Consumer Cyclicals' },
  { ticker: 'MAPI', name: 'Mitra Adiperkasa Tbk', sector: 'Consumer Cyclicals' },
  { ticker: 'MAPA', name: 'MAP Aktif Adiperkasa Tbk', sector: 'Consumer Cyclicals' },
  { ticker: 'ACES', name: 'Aspirasi Hidup Indonesia Tbk', sector: 'Consumer Cyclicals' },
  { ticker: 'ERAA', name: 'Erajaya Swasembada Tbk', sector: 'Consumer Cyclicals' },
  { ticker: 'GGRM', name: 'Gudang Garam Tbk', sector: 'Consumer Non-Cyclicals' },
  { ticker: 'HMSP', name: 'HM Sampoerna Tbk', sector: 'Consumer Non-Cyclicals' },

  // Telecommunications & Technology
  { ticker: 'TLKM', name: 'Telkom Indonesia Tbk', sector: 'Telecommunications' },
  { ticker: 'ISAT', name: 'Indosat Tbk', sector: 'Telecommunications' },
  { ticker: 'EXCL', name: 'XL Axiata Tbk', sector: 'Telecommunications' },
  { ticker: 'TOWR', name: 'Sarana Menara Nusantara Tbk', sector: 'Infrastructure' },
  { ticker: 'TBIG', name: 'Tower Bersama Infrastructure Tbk', sector: 'Infrastructure' },
  { ticker: 'MTEL', name: 'Dayamitra Telekomunikasi Tbk', sector: 'Infrastructure' },
  { ticker: 'GOTO', name: 'GoTo Gojek Tokopedia Tbk', sector: 'Technology' },
  { ticker: 'BUKA', name: 'Bukalapak.com Tbk', sector: 'Technology' },
  { ticker: 'EMTK', name: 'Elang Mahkota Teknologi Tbk', sector: 'Technology' },
  { ticker: 'SCMA', name: 'Surya Citra Media Tbk', sector: 'Communication' },

  // Infrastructure, Construction & Property
  { ticker: 'JSMR', name: 'Jasa Marga Tbk', sector: 'Infrastructure' },
  { ticker: 'PTPP', name: 'PP (Persero) Tbk', sector: 'Infrastructures' },
  { ticker: 'ADHI', name: 'Adhi Karya Tbk', sector: 'Infrastructures' },
  { ticker: 'WIKA', name: 'Wijaya Karya Tbk', sector: 'Infrastructures' },
  { ticker: 'CTRA', name: 'Ciputra Development Tbk', sector: 'Real Estate' },
  { ticker: 'BSDE', name: 'Bumi Serpong Damai Tbk', sector: 'Real Estate' },
  { ticker: 'SMRA', name: 'Summarecon Agung Tbk', sector: 'Real Estate' },
  { ticker: 'PWON', name: 'Pakuwon Jati Tbk', sector: 'Real Estate' },
  { ticker: 'ASRI', name: 'Alam Sutera Realty Tbk', sector: 'Real Estate' },
  { ticker: 'PANI', name: 'Pantai Indah Kapuk Dua Tbk', sector: 'Real Estate' },

  // Cement, Pulp, Paper & Basic Industry
  { ticker: 'SMGR', name: 'Semen Indonesia Tbk', sector: 'Basic Materials' },
  { ticker: 'INTP', name: 'Indocement Tunggal Prakarsa Tbk', sector: 'Basic Materials' },
  { ticker: 'BRPT', name: 'Barito Pacific Tbk', sector: 'Basic Materials' },
  { ticker: 'TPIA', name: 'Chandra Asri Pacific Tbk', sector: 'Basic Materials' },
  { ticker: 'BREN', name: 'Barito Renewables Energy Tbk', sector: 'Utilities' },
  { ticker: 'CUAN', name: 'Petrindo Jaya Kreasi Tbk', sector: 'Energy' },
  { ticker: 'INKP', name: 'Indah Kiat Pulp & Paper Tbk', sector: 'Basic Materials' },
  { ticker: 'TKIM', name: 'Pabrik Kertas Tjiwi Kimia Tbk', sector: 'Basic Materials' },
  { ticker: 'AVIA', name: 'Avia Avian Tbk', sector: 'Basic Materials' },
  { ticker: 'ESSA', name: 'Essa Industries Indonesia Tbk', sector: 'Energy' },

  // Agribusiness & Plantations
  { ticker: 'AALI', name: 'Astra Agro Lestari Tbk', sector: 'Consumer Non-Cyclicals' },
  { ticker: 'LSIP', name: 'PP London Sumatra Indonesia Tbk', sector: 'Consumer Non-Cyclicals' },
  { ticker: 'TAPG', name: 'Triputra Agro Persada Tbk', sector: 'Consumer Non-Cyclicals' },
  { ticker: 'DSNG', name: 'Dharma Satya Nusantara Tbk', sector: 'Consumer Non-Cyclicals' },
  { ticker: 'SSMS', name: 'Sawit Sumbermas Sarana Tbk', sector: 'Consumer Non-Cyclicals' },

  // Logistics, Transportation & Conglomerate
  { ticker: 'SMDR', name: 'Samudera Indonesia Tbk', sector: 'Transportation' },
  { ticker: 'TMAS', name: 'Temas Tbk', sector: 'Transportation' },
  { ticker: 'BIRD', name: 'Blue Bird Tbk', sector: 'Transportation' },
  { ticker: 'ASSA', name: 'Adi Sarana Armada Tbk', sector: 'Transportation' },
  { ticker: 'SRTG', name: 'Saratoga Investama Sedaya Tbk', sector: 'Financials' },
];
