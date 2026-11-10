import importlib.util, json, pathlib, tempfile, unittest, zipfile
ROOT=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('dids',ROOT/'scripts/dids.py');dids=importlib.util.module_from_spec(spec);spec.loader.exec_module(dids)
class PipelineTests(unittest.TestCase):
 def test_configuration(self):
  self.assertEqual(len(dids.CFG['cameras']),5)
  self.assertEqual(dids.CFG['states_per_camera'],10)
  self.assertFalse(dids.CFG['central_power_initially_on'])
 def test_entrypoints(self):
  for name in [dids.CFG['entrypoint'],'game.js','renderer3d.js']:
   self.assertTrue((dids.SRC/name).is_file(),name)
 def test_camera_asset_inventory(self):
  qa=dids.audit();self.assertEqual(qa['camera_counts'],{c:10 for c in dids.CFG['cameras']});self.assertTrue(qa['passed'],qa['errors'])
 def test_webp_header(self):
  p=next(dids.SRC.rglob('*.webp'))
  self.assertEqual(list(dids.webp_size(p)),[1920,1080])
 def test_bad_webp_rejected(self):
  with tempfile.TemporaryDirectory() as d:
   p=pathlib.Path(d)/'bad.webp';p.write_bytes(b'garbage')
   with self.assertRaises(ValueError):dids.webp_size(p)
 def test_art_not_misrepresented(self):self.assertEqual(dids.CFG['art_status'],'NOT_FINAL_ART_APPROVED')
 def test_source_no_external_script_urls(self):
  html=(dids.SRC/dids.CFG['entrypoint']).read_text(encoding='utf-8')
  self.assertNotIn('<script src="https://',html)
if __name__=='__main__':unittest.main()
