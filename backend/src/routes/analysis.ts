import { Router, Request, Response } from 'express';
import { Analysis } from '../models';
import * as analyzer from '../services/analyzer';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Background processing — runs analysis and updates the DB record with progress
async function processAnalysis(id: string, text: string) {
  try {
    console.log(`[analysis] Starting background processing for ${id}`);
    await Analysis.update({ status: 'processing' }, { where: { id } });

    const onProgress = async (progress: any) => {
      try {
        await Analysis.update(
          { progress: progress as any },
          { where: { id } }
        );
      } catch (e) {
        // Non-critical — don't let progress update failures crash the analysis
      }
    };

    const { provider, results } = await analyzer.analyzeText(text, onProgress);
    const aggregated = analyzer.aggregateResults(results);

    await Analysis.update(
      {
        status: 'completed',
        title: aggregated.title,
        overallScore: aggregated.overallScore,
        sections: aggregated.sections as any,
        models: results.map(r => r.model) as any,
        provider,
        summary: aggregated.summary,
        perModelResults: results as any,
        progress: { totalModels: results.length, completedModels: results.length, modelStatuses: {} } as any,
      },
      { where: { id } }
    );

    console.log(`[analysis] Completed ${id} — score: ${aggregated.overallScore}, models: ${results.length}`);
  } catch (error: any) {
    console.error(`[analysis] Failed ${id}:`, error?.message || error);
    await Analysis.update(
      { status: 'failed', error: error?.message || 'Analysis failed' },
      { where: { id } }
    ).catch(e => console.error('[analysis] Failed to update error status:', e));
  }
}

// Submit text for analysis — returns immediately with job ID
router.post('/', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const id = uuidv4();
    const analysis = await Analysis.create({
      id,
      title: 'Analyzing...',
      inputText: text.trim(),
      status: 'pending',
      models: [] as any,
      provider: 'openrouter',
    });

    // Fire and forget — processing happens in the background
    processAnalysis(id, text.trim());

    res.status(202).json({
      id: analysis.id,
      status: 'pending',
    });
  } catch (error: any) {
    console.error('[analysis] Error creating job:', error?.message || error);
    res.status(500).json({ error: error.message || 'Failed to create analysis' });
  }
});

// Get analysis status/result — used for polling
// Excludes inputText during polling for efficiency; includes it only when completed
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const analysis = await Analysis.findByPk(req.params.id);
    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    const result: any = {
      id: analysis.id,
      title: analysis.title,
      status: analysis.status,
      overallScore: analysis.overallScore,
      sections: analysis.sections,
      models: analysis.models,
      provider: analysis.provider,
      summary: analysis.summary,
      error: analysis.error,
      perModelResults: analysis.perModelResults,
      progress: analysis.progress,
      createdAt: analysis.createdAt,
    };

    // Only include inputText for completed analyses or when explicitly requested
    if (analysis.status === 'completed' || req.query.full === 'true') {
      result.inputText = analysis.inputText;
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch analysis' });
  }
});

// Get analysis history
router.get('/', async (_req: Request, res: Response) => {
  try {
    const analyses = await Analysis.findAll({
      order: [['createdAt', 'DESC']],
      limit: 50,
      attributes: ['id', 'title', 'status', 'overallScore', 'provider', 'models', 'createdAt'],
    });
    res.json(analyses);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch analyses' });
  }
});

// Delete analysis
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await Analysis.destroy({ where: { id: req.params.id } });
    if (!deleted) {
      return res.status(404).json({ error: 'Analysis not found' });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete analysis' });
  }
});

export default router;
