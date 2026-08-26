import { Router } from 'express';

import { notFound } from '../lib/errors.ts';
import { routeParam } from '../lib/params.ts';
import { getCatalog, getTrack } from '../services/catalog.service.ts';

/** Public catalogue — readable without a session so Home can render before sign-in. */
export const catalogRoutes = Router();

catalogRoutes.get('/', (_req, res) => {
  res.json(getCatalog());
});

catalogRoutes.get('/tracks/:trackId', (req, res) => {
  const track = getTrack(routeParam(req, 'trackId'));
  if (!track) throw notFound('This release is no longer available.');
  res.json(track);
});
