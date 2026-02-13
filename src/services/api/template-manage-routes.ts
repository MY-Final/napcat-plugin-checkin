/**
 * 模板管理路由 - 模板 CRUD API
 */
import type { NapCatPluginContext } from 'napcat-types/napcat-onebot/network/plugin/types';
import {
    getAllTemplates,
    getTemplateById,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    setDefaultTemplate,
    getTemplatesByType,
    loadTemplateConfig,
    saveTemplateConfig,
    initDefaultTemplates,
} from '../template-service';
import type { TemplateType, CreateTemplateParams, UpdateTemplateParams } from '../../types';

export function registerTemplateManageRoutes(ctx: NapCatPluginContext): void {
    const router = ctx.router;

    router.getNoAuth('/templates', (_req, res) => {
        try {
            const templates = getAllTemplates();
            res.json({
                code: 0,
                data: templates,
            });
        } catch (err) {
            ctx.logger.error('获取模板列表失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    router.getNoAuth('/templates/:id', (req, res) => {
        try {
            const id = req.params?.id;
            if (!id) {
                return res.status(400).json({ code: -1, message: '缺少模板 ID' });
            }

            const template = getTemplateById(id);
            if (!template) {
                return res.status(404).json({ code: -1, message: '模板不存在' });
            }

            res.json({
                code: 0,
                data: template,
            });
        } catch (err) {
            ctx.logger.error('获取模板失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    router.getNoAuth('/templates/type/:type', (req, res) => {
        try {
            const type = req.params?.type as TemplateType;
            if (!type || (type !== 'checkin' && type !== 'leaderboard')) {
                return res.status(400).json({ code: -1, message: '无效的模板类型' });
            }

            const templates = getTemplatesByType(type);
            res.json({
                code: 0,
                data: templates,
            });
        } catch (err) {
            ctx.logger.error('获取模板列表失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    router.postNoAuth('/templates', (req, res) => {
        try {
            const body = req.body as CreateTemplateParams | undefined;

            if (!body?.name || !body?.type || !body?.html) {
                return res.status(400).json({ code: -1, message: '缺少必要参数: name, type, html' });
            }

            if (body.type !== 'checkin' && body.type !== 'leaderboard') {
                return res.status(400).json({ code: -1, message: '无效的模板类型' });
            }

            const template = createTemplate(body);

            ctx.logger.info(`创建模板成功: ${template.name} (${template.id})`);

            res.json({
                code: 0,
                data: template,
            });
        } catch (err) {
            ctx.logger.error('创建模板失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    router.putNoAuth('/templates/:id', (req, res) => {
        try {
            const id = req.params?.id;
            const body = req.body as UpdateTemplateParams | undefined;

            if (!id) {
                return res.status(400).json({ code: -1, message: '缺少模板 ID' });
            }

            const template = updateTemplate(id, body || {});

            if (!template) {
                return res.status(404).json({ code: -1, message: '模板不存在' });
            }

            ctx.logger.info(`更新模板成功: ${template.name} (${template.id})`);

            res.json({
                code: 0,
                data: template,
            });
        } catch (err) {
            ctx.logger.error('更新模板失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    router.deleteNoAuth('/templates/:id', (req, res) => {
        try {
            const id = req.params?.id;

            if (!id) {
                return res.status(400).json({ code: -1, message: '缺少模板 ID' });
            }

            const deleted = deleteTemplate(id);

            if (!deleted) {
                return res.status(404).json({ code: -1, message: '模板不存在或删除失败' });
            }

            ctx.logger.info(`删除模板成功: ${id}`);

            res.json({
                code: 0,
                message: '删除成功',
            });
        } catch (err) {
            ctx.logger.error('删除模板失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    router.postNoAuth('/templates/:id/duplicate', (req, res) => {
        try {
            const id = req.params?.id;
            const body = req.body as { name?: string } | undefined;

            if (!id) {
                return res.status(400).json({ code: -1, message: '缺少模板 ID' });
            }

            const template = duplicateTemplate(id, body?.name);

            if (!template) {
                return res.status(404).json({ code: -1, message: '模板不存在' });
            }

            ctx.logger.info(`复制模板成功: ${template.name} (${template.id})`);

            res.json({
                code: 0,
                data: template,
            });
        } catch (err) {
            ctx.logger.error('复制模板失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    router.postNoAuth('/templates/:id/set-default', (req, res) => {
        try {
            const id = req.params?.id;

            if (!id) {
                return res.status(400).json({ code: -1, message: '缺少模板 ID' });
            }

            const success = setDefaultTemplate(id);

            if (!success) {
                return res.status(404).json({ code: -1, message: '模板不存在' });
            }

            ctx.logger.info(`设置默认模板成功: ${id}`);

            res.json({
                code: 0,
                message: '设置成功',
            });
        } catch (err) {
            ctx.logger.error('设置默认模板失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    router.getNoAuth('/templates/config', (_req, res) => {
        try {
            const config = loadTemplateConfig();
            res.json({
                code: 0,
                data: config,
            });
        } catch (err) {
            ctx.logger.error('获取模板配置失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    router.postNoAuth('/templates/config', (req, res) => {
        try {
            const body = req.body as {
                randomMode?: 'none' | 'random' | 'sequential' | 'daily';
                checkinTemplateId?: string | null;
                leaderboardTemplateId?: string | null;
            } | undefined;

            if (!body) {
                return res.status(400).json({ code: -1, message: '缺少配置参数' });
            }

            saveTemplateConfig(body);

            ctx.logger.info('模板配置已更新');

            res.json({
                code: 0,
                message: '配置已更新',
            });
        } catch (err) {
            ctx.logger.error('更新模板配置失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    router.postNoAuth('/templates/init-defaults', (_req, res) => {
        try {
            initDefaultTemplates();
            ctx.logger.info('默认模板初始化完成');
            res.json({
                code: 0,
                message: '初始化成功',
            });
        } catch (err) {
            ctx.logger.error('初始化默认模板失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });
}
