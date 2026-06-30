const Resource = require('../models/Resource');

function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

exports.getPublicResources = async (req, res) => {
    try {
        const { language, tag } = req.query;
        const filter = {};
        
        if (language) filter.language = language;
        if (tag) filter.tags = tag;
        
        const resources = await Resource.find(filter).sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: resources, error: null });
    } catch (error) {
        console.error('Error fetching public resources:', error.message);
        res.status(500).json({ success: false, data: null, error: 'Server error while fetching resources.' });
    }
};

exports.getAdminResources = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const skip = (page - 1) * limit;
        const { search } = req.query;
        
        let filter = {};
        if (search) {
            const searchRegex = new RegExp(escapeRegex(search), 'i');
            filter = { $or: [{ title: searchRegex }, { description: searchRegex }, { tags: searchRegex }] };
        }
        
        const [resources, total] = await Promise.all([
            Resource.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
            Resource.countDocuments(filter)
        ]);
        
        res.status(200).json({ success: true, data: { items: resources, total, pages: Math.ceil(total / limit), currentPage: page }, error: null });
    } catch (error) {
        console.error('Error fetching admin resources:', error.message);
        res.status(500).json({ success: false, data: null, error: 'Server error while fetching resources.' });
    }
};

exports.getAdminResourceById = async (req, res) => {
    try {
        const resource = await Resource.findById(req.params.id);
        if (!resource) {
            return res.status(404).json({ success: false, data: null, error: 'Resource not found.' });
        }
        res.status(200).json({ success: true, data: resource, error: null });
    } catch (error) {
        console.error('Error fetching resource by ID:', error.message);
        res.status(500).json({ success: false, data: null, error: 'Server error.' });
    }
};

exports.createResource = async (req, res) => {
    try {
        const { title, description, type, url, language, tags } = req.body;
        const tagsArray = typeof tags === 'string' && tags.trim() !== '' ? tags.split(',').map(tag => tag.trim()) : [];
        
        const resource = await Resource.create({ title, description, type, url, language, tags: tagsArray });
        res.status(201).json({ success: true, data: resource, error: null });
    } catch (error) {
        console.error('Error creating resource:', error.message);
        res.status(400).json({ success: false, data: null, error: 'Failed to create resource. Please check your input.' });
    }
};

exports.updateResource = async (req, res) => {
    try {
        const { title, description, type, url, language, tags } = req.body;
        const tagsArray = typeof tags === 'string' ? tags.split(',').map(tag => tag.trim()) : tags;
        const updateData = { title, description, type, url, language, tags: tagsArray };
        
        const resource = await Resource.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
        if (!resource) {
            return res.status(404).json({ success: false, data: null, error: 'Resource not found.' });
        }
        res.status(200).json({ success: true, data: resource, error: null });
    } catch (error) {
        console.error('Error updating resource:', error.message);
        res.status(400).json({ success: false, data: null, error: 'Failed to update resource.' });
    }
};

exports.deleteResource = async (req, res) => {
    try {
        const resource = await Resource.findByIdAndDelete(req.params.id);
        if (!resource) {
            return res.status(404).json({ success: false, data: null, error: 'Resource not found.' });
        }
        res.status(200).json({ success: true, data: { message: 'Resource deleted successfully.' }, error: null });
    } catch (error) {
        console.error('Error deleting resource:', error.message);
        res.status(500).json({ success: false, data: null, error: 'Server error while deleting resource.' });
    }
};