import ReactNativeBlobUtil from 'react-native-blob-util';

type ShareCsvOptions = {
  fileName: string;
  title: string;
  contents: string;
};

export async function shareCsvFile({
  fileName,
  title,
  contents,
}: ShareCsvOptions) {
  const safeFileName = fileName.replace(/[^A-Za-z0-9._-]/g, '_');
  const csvFileName = safeFileName.toLowerCase().endsWith('.csv')
    ? safeFileName
    : `${safeFileName}.csv`;
  const path = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/${csvFileName}`;
  const excelCompatibleCsv = `\uFEFF${contents.replace(/\r?\n/g, '\r\n')}`;

  await ReactNativeBlobUtil.fs.writeFile(path, excelCompatibleCsv, 'utf8');
  const { default: Share } = await import('react-native-share');
  await Share.open({
    title,
    subject: title,
    url: `file://${path}`,
    type: 'text/csv',
    filename: csvFileName,
    failOnCancel: false,
  });
}
