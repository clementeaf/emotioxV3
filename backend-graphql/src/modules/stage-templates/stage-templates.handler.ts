import { Request, Response } from 'express';
import * as stageTemplatesService from './stage-templates.service';

export const list = async (req: Request, res: Response) => {
    try {
        const stages = await stageTemplatesService.list();
        res.json(stages);
    } catch (error) {
        console.error('Error listing stage templates:', error);
        res.status(500).json({ error: 'Failed to fetch stage templates' });
    }
};

export const create = async (req: Request, res: Response) => {
    try {
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        const stage = await stageTemplatesService.create({
            name,
            description,
            created_by: null
        });

        res.status(201).json(stage);
    } catch (error) {
        console.error('Error creating stage template:', error);
        res.status(500).json({ error: 'Failed to create stage template' });
    }
};

export const getById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const stage = await stageTemplatesService.getById(id);
        res.json(stage);
    } catch (error: any) {
        console.error('Error fetching stage template:', error);
        if (error.message === 'Stage template not found') {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to fetch stage template' });
    }
};

export const update = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;

        const stage = await stageTemplatesService.update(id, {
            name,
            description
        });

        res.json(stage);
    } catch (error: any) {
        console.error('Error updating stage template:', error);
        if (error.message === 'Stage template not found') {
            return res.status(404).json({ error: error.message });
        }
        if (error.message === 'No fields to update') {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to update stage template' });
    }
};

export const deleteTemplate = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await stageTemplatesService.deleteTemplate(id);
        res.json(result);
    } catch (error: any) {
        console.error('Error deleting stage template:', error);
        if (error.message === 'Stage template not found') {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to delete stage template' });
    }
};

export const addModule = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { moduleId, displayOrder } = req.body;

        if (!moduleId) {
            return res.status(400).json({ error: 'moduleId is required' });
        }

        const result = await stageTemplatesService.addModule(id, moduleId, displayOrder);
        res.json(result);
    } catch (error) {
        console.error('Error adding module to stage:', error);
        res.status(500).json({ error: 'Failed to add module to stage' });
    }
};

export const removeModule = async (req: Request, res: Response) => {
    try {
        const { id, moduleId } = req.params;
        const result = await stageTemplatesService.removeModule(id, moduleId);
        res.json(result);
    } catch (error: any) {
        console.error('Error removing module from stage:', error);
        if (error.message === 'Module not found in this stage') {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to remove module from stage' });
    }
};
