import User from '../models/user.model.js';

export const updateAgentAvatar = async (req, res) => {
  try {
    const userId = req.params.id;
    const { avatar } = req.body;

    console.log('[Avatar Update] Request:', {
      userId,
      hasAvatar: !!avatar
    });

    if (!avatar) {
      return res.status(400).json({
        success: false,
        message: 'Avatar URL is required'
      });
    }

    // Update user avatar directly
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { avatar } },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('[Avatar Update] Success:', {
      userId,
      newAvatar: avatar
    });

    res.status(200).json({
      success: true,
      message: 'Avatar updated successfully',
      data: {
        avatar: updatedUser.avatar
      }
    });
  } catch (error) {
    console.error('[Avatar Update] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating avatar',
      error: error.message
    });
  }
};
