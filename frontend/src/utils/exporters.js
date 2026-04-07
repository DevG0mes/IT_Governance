export function formatDateISO(v) {
  if (!v) return '';
  return String(v).slice(0, 10);
}

export function getAssetDetail(a) {
  return (
    a?.Notebook ||
    a?.notebook ||
    a?.asset_notebook ||
    a?.asset_notebooks ||
    a?.Celular ||
    a?.celular ||
    a?.asset_celular ||
    a?.asset_celulares ||
    a?.Chip ||
    a?.chip ||
    a?.asset_chip ||
    a?.asset_chips ||
    a?.Starlink ||
    a?.starlink ||
    a?.asset_starlink ||
    a?.asset_starlinks ||
    null
  );
}

export function getAssignmentList(a) {
  return a?.AssetAssignments || a?.assignments || a?.AssetAssignment || [];
}

export function getActiveAssignment(a) {
  const list = getAssignmentList(a);
  return Array.isArray(list) ? list.find((x) => !x?.returned_at) : null;
}

export function getActiveEmployee(a) {
  const asg = getActiveAssignment(a);
  return asg?.Employee || asg?.employee || null;
}

export function getAssetIdentifier(a) {
  const nb = a?.Notebook || a?.notebook;
  const cel = a?.Celular || a?.celular;
  const ch = a?.Chip || a?.chip;
  const st = a?.Starlink || a?.starlink;
  return nb?.patrimonio || cel?.imei || ch?.numero || st?.grupo || '';
}

export function getAssetSecondaryIdentifier(a) {
  const nb = a?.Notebook || a?.notebook;
  const cel = a?.Celular || a?.celular;
  const ch = a?.Chip || a?.chip;
  return nb?.serial_number || cel?.imei || ch?.iccid || '';
}

export function getModeloOuPlano(a) {
  const nb = a?.Notebook || a?.notebook;
  const cel = a?.Celular || a?.celular;
  const ch = a?.Chip || a?.chip;
  const st = a?.Starlink || a?.starlink;
  return nb?.modelo || cel?.modelo || st?.modelo || ch?.plano || '';
}

export function getGrupo(a) {
  const cel = a?.Celular || a?.celular;
  const ch = a?.Chip || a?.chip;
  const st = a?.Starlink || a?.starlink;
  return cel?.grupo || ch?.grupo || st?.grupo || '';
}

export function getResponsavelLocal(a) {
  const cel = a?.Celular || a?.celular;
  const ch = a?.Chip || a?.chip;
  const st = a?.Starlink || a?.starlink;
  return cel?.responsavel || ch?.responsavel || st?.responsavel || '';
}

export function getGarantiaNotebook(a) {
  const nb = a?.Notebook || a?.notebook;
  return nb?.garantia || '';
}

export function getStatusGarantiaNotebook(a) {
  const nb = a?.Notebook || a?.notebook;
  return nb?.status_garantia || '';
}

export function getDataAquisicao(a) {
  const d =
    a?.Notebook?.data_aquisicao ||
    a?.notebook?.data_aquisicao ||
    a?.Celular?.data_aquisicao ||
    a?.celular?.data_aquisicao ||
    a?.Chip?.data_aquisicao ||
    a?.chip?.data_aquisicao ||
    a?.Starlink?.data_aquisicao ||
    a?.starlink?.data_aquisicao ||
    '';
  return formatDateISO(d);
}

