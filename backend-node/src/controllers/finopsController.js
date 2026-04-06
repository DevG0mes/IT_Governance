const {
  Asset,
  AssetNotebook,
  AssetStarlink,
  AssetChip,
  AssetCelular,
  CatalogItem,
  License,
  EmployeeLicense,
  Contract,
} = require('../../config/db');
const { buildFinopsSnapshot } = require('../services/finopsRules');

exports.getSnapshot = async (req, res) => {
  try {
    const [assets, catalogItems, licenses, contracts] = await Promise.all([
      Asset.findAll({
        include: [
          { model: AssetNotebook, as: 'Notebook' },
          { model: AssetStarlink, as: 'Starlink' },
          { model: AssetChip, as: 'Chip' },
          { model: AssetCelular, as: 'Celular' },
        ],
      }),
      CatalogItem.findAll(),
      License.findAll({
        include: [
          {
            model: EmployeeLicense,
            as: 'EmployeeLicenses',
            required: false,
          },
        ],
      }),
      Contract.findAll(),
    ]);

    const snapshot = buildFinopsSnapshot({
      assets,
      catalogItems,
      licenses,
      contracts,
    });

    return res.status(200).json({ data: snapshot });
  } catch (error) {
    console.error('❌ FinOps snapshot:', error.message);
    return res.status(500).json({ error: 'Erro ao montar painel FinOps' });
  }
};
