import * as adminService from '../services/adminService.js';
import * as userService from '../services/userService.js';
import * as disputeRepository from '../repositories/disputeRepository.js';
import * as paymentRepository from '../repositories/paymentRepository.js';
import * as projectRepository from '../repositories/projectRepository.js';
import * as auditRepository from '../repositories/auditRepository.js';
import * as testimonialService from '../services/testimonialService.js';
import * as reviewRepository from '../repositories/reviewRepository.js';
import {
    validatedBody,
    validatedParams,
    validatedQuery,
} from '../middleware/validateRequest.js';
import { validationError } from '../utils/errors.js';

export async function getUsers(req, res, next) {
    try {
        const { page, limit } = validatedQuery(req);
        const result = await adminService.getAllUsers({ page, limit });
        return res.status(200).json(result);
    } catch (err) {
        if (err.statusCode) {
            return res.status(err.statusCode).json({ message: err.message });
        }
        next(err);
    }
};

export async function updateUser(req, res, next) {
    try {
        const { id } = validatedParams(req);
        const payload = validatedBody(req);
        const updatedUser = await adminService.updateUserById(id, payload);

        await auditRepository.insertAuditLog({
          entity: "User",
          entityID: id,
          actionPerformed: "update",
          oldValue: "previous",
          newValue: JSON.stringify(payload),
          userID: req.user.id,
        }).catch(() => {});

        return res.status(200).json({
            message: 'User updated successfully.',
            user: updatedUser,
        });
    } catch (err) {
        if (err.statusCode) {
            return res.status(err.statusCode).json({ message: err.message });
        }
        next(err);
    }
};

export async function deleteUser(req, res, next) {
    try {
        const { id } = validatedParams(req);
        const result = await adminService.deleteUserById(id);
        return res.status(200).json({
            message: 'User marked as inactive.',
            user: result,
        });
    } catch (err) {
        if (err.statusCode) {
            return res.status(err.statusCode).json({ message: err.message });
        }
        next(err);
    }
};

export async function registerUser(req, res, next) {
     try {
            const result = await userService.registerUser(validatedBody(req));
            return res.status(201).json({
                id: result.userID,
                email: result.email,
                fullName: result.fullName,
                roleID: result.roleID,
            });
        } catch (err) {
            if (err.statusCode) {
                return res.status(err.statusCode).json({ message: err.message });
            }
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ message: 'An account with this email already exists.' });
            }
            next(err);
        }
};

export async function getDisputes(req, res, next) {
    try {
        const { status } = validatedQuery(req);
        const disputes = await disputeRepository.getAllDisputes({ status: status || undefined });
        return res.status(200).json({
            total: disputes.length,
            disputes,
        });
    } catch (err) {
        if (err.statusCode) {
            return res.status(err.statusCode).json({ message: err.message });
        }
        next(err);
    }
}

export async function getDisputeById(req, res, next) {
    try {
        const { id } = validatedParams(req);
        const dispute = await disputeRepository.getDisputeById(id);
        if (!dispute) {
            return res.status(404).json({ message: 'Dispute not found.' });
        }
        return res.status(200).json(dispute);
    } catch (err) {
        if (err.statusCode) {
            return res.status(err.statusCode).json({ message: err.message });
        }
        next(err);
    }
}

export async function getAllPayments(req, res, next) {
  try {
    const { page = 1, limit = 50, pStatus } = validatedQuery(req);
    const offset = (Math.max(Number(page), 1) - 1) * Math.min(Number(limit) || 50, 200);

    const [payments, total] = await Promise.all([
      paymentRepository.getAllPayments({ limit, offset, pStatus: pStatus || null }),
      paymentRepository.countAllPayments({ pStatus: pStatus || null }),
    ]);
    const statusCounts = {};
    payments.forEach((p) => {
      statusCounts[p.pStatus] = (statusCounts[p.pStatus] || 0) + 1;
    });

    const totalVolume = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    return res.status(200).json({
      total,
      page: Number(page),
      limit: Number(limit),
      payments,
      statistics: {
        totalPayments: total,
        totalVolume: Number(totalVolume.toFixed(2)),
        byStatus: statusCounts,
      },
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    next(err);
  }
}

export async function getAllApplications(req, res, next) {
  try {
    const { page = 1, limit = 50, propStatus } = validatedQuery(req);
    const offset = (Math.max(Number(page), 1) - 1) * Math.min(Number(limit) || 50, 200);

    const [proposals, total] = await Promise.all([
      projectRepository.getAllProposals({ limit, offset, propStatus: propStatus || null }),
      projectRepository.countAllProposals({ propStatus: propStatus || null }),
    ]);

    const statusCounts = {};
    proposals.forEach((p) => {
      statusCounts[p.propStatus] = (statusCounts[p.propStatus] || 0) + 1;
    });

    return res.status(200).json({
      total,
      page: Number(page),
      limit: Number(limit),
      applications: proposals,
      statistics: {
        totalApplications: total,
        byStatus: statusCounts,
      },
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    next(err);
  }
}

export async function updateDisputeStatus(req, res, next) {
    try {
        const { id } = validatedParams(req);
        const { status, resolution } = validatedBody(req);

        if (!status) {
            throw validationError('Status is required.');
        }

        const validStatuses = ['open', 'in_review', 'resolved', 'rejected'];
        if (!validStatuses.includes(status)) {
            throw validationError(`Status must be one of: ${validStatuses.join(', ')}`);
        }

        const updatedDispute = await disputeRepository.updateDisputeStatus({
            id,
            status,
            resolution: resolution || null,
            resolvedBy: req.user?.id,
        });

        if (!updatedDispute) {
            return res.status(404).json({ message: 'Dispute not found.' });
        }

        await auditRepository.insertAuditLog({
          entity: "Dispute",
          entityID: id,
          actionPerformed: "update_status",
          oldValue: "previous",
          newValue: JSON.stringify(validatedBody(req)),
          userID: req.user.id,
        }).catch(() => {});

        return res.status(200).json({
            message: 'Dispute updated successfully.',
            dispute: updatedDispute,
        });
    } catch (err) {
        if (err.statusCode) {
            return res.status(err.statusCode).json({ message: err.message });
        }
        next(err);
    }
}

export async function getAllContracts(req, res, next) {
  try {
    const { page = 1, limit = 20, status, search } = validatedQuery(req);
    const result = await projectRepository.getAllContractsForAdmin({ page, limit, status, search });
    return res.status(200).json(result);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    next(err);
  }
}

export async function getAuditLogs(req, res, next) {
  try {
    const { page, limit, entity, actionPerformed, fromDate, toDate } = validatedQuery(req);
    const result = await auditRepository.getAuditLogs({ page, limit, entity, actionPerformed, fromDate, toDate });
    return res.status(200).json(result);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    next(err);
  }
}

export async function deleteAuditLog(req, res, next) {
  try {
    const { id } = validatedParams(req);
    const result = await auditRepository.deleteAuditLog(id);
    return res.status(200).json({
      message: 'Audit log deleted successfully.',
      ...result,
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    next(err);
  }
}

export async function deleteOldAuditLogs(req, res, next) {
  try {
    const { days = 90 } = validatedQuery(req);
    const result = await auditRepository.deleteOldAuditLogs(Number(days));
    return res.status(200).json({
      message: `Deleted old audit logs older than ${days} days.`,
      ...result,
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    next(err);
  }
}

export async function getAllTestimonials(req, res, next) {
  try {
    const { limit = 100, includeUnpublished = 'true' } = validatedQuery(req);
    const testimonials = await testimonialService.getTestimonials(Number(limit));
    return res.status(200).json({ testimonials });
  } catch (err) {
    next(err);
  }
}

export async function updateTestimonial(req, res, next) {
  try {
    const { id } = validatedParams(req);
    const updated = await testimonialService.updateMyTestimonial ?
      (async () => {
        const { fullName, roleTitle, rating, comment, isPublished } = validatedBody(req);
        const [result] = await (await import('../config/db.js')).db.execute(
          `UPDATE Testimonials SET fullName = ?, roleTitle = ?, rating = ?, comment = ?, isPublished = ? WHERE id = ?`,
          [fullName, roleTitle, rating, comment, isPublished !== undefined ? !!isPublished : true, id]
        );
        if (result.affectedRows === 0) throw Object.assign(new Error('Not found'), {statusCode:404});
        return { id, ...validatedBody(req) };
      })() : null;
    return res.status(200).json({ message: 'Testimonial updated.', testimonial: updated });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ message: err.message });
    next(err);
  }
}

export async function deleteTestimonial(req, res, next) {
  try {
    const { id } = validatedParams(req);
    const [result] = await (await import('../config/db.js')).db.execute('DELETE FROM Testimonials WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Testimonial not found.' });
    }
    return res.status(200).json({ message: 'Testimonial deleted.' });
  } catch (err) {
    next(err);
  }
}

export async function getAllReviews(req, res, next) {
  try {
    const { limit = 50, stars, isVerified } = validatedQuery(req);
    let where = 'deletedAt IS NULL';
    const params = [];
    if (stars) { where += ' AND stars = ?'; params.push(Number(stars)); }
    if (isVerified !== undefined) { where += ' AND isVerified = ?'; params.push(!!isVerified); }
    const [rows] = await (await import('../config/db.js')).db.execute(
      `SELECT * FROM Review WHERE ${where} ORDER BY createdAt DESC LIMIT ${Number(limit)}`,
      params
    );
    return res.status(200).json({ reviews: rows.map(r => ({...r, tags: r.tags ? (typeof r.tags==='string'?JSON.parse(r.tags):r.tags) : [] })) });
  } catch (err) {
    next(err);
  }
}

export async function updateReview(req, res, next) {
  try {
    const { id } = validatedParams(req);
    const { title, comment, stars, isVerified, tags } = validatedBody(req);
    const tagsJson = tags ? JSON.stringify(tags) : null;
    const [result] = await (await import('../config/db.js')).db.execute(
      `UPDATE Review SET title = ?, comment = ?, stars = ?, isVerified = ?, tags = ? WHERE id = ? AND deletedAt IS NULL`,
      [title || null, comment, stars || null, isVerified !== undefined ? !!isVerified : null, tagsJson, id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Review not found.' });
    return res.status(200).json({ message: 'Review updated.' });
  } catch (err) {
    next(err);
  }
}

export async function deleteReview(req, res, next) {
  try {
    const { id } = validatedParams(req);
    const [result] = await (await import('../config/db.js')).db.execute(
      'UPDATE Review SET deletedAt = NOW() WHERE id = ?',
      [id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Review not found.' });
    return res.status(200).json({ message: 'Review deleted (soft).' });
  } catch (err) {
    next(err);
  }
}
export async function getAllMilestones(req, res, next) {
  try {
    const { limit = 50, status } = validatedQuery(req);
    let where = '1=1';
    const params = [];
    if (status) { where += ' AND status = ?'; params.push(status); }
    const [rows] = await (await import('../config/db.js')).db.execute(
      `SELECT m.*, p.title as projectTitle, c.id as contractId FROM Milestones m
       LEFT JOIN Project p ON p.id = m.projectID
       LEFT JOIN Contracts c ON c.id = m.contractID
       WHERE ${where} ORDER BY m.createdAt DESC LIMIT ${Number(limit)}`,
      params
    );
    return res.status(200).json({ milestones: rows });
  } catch (err) {
    next(err);
  }
}

export async function updateMilestoneStatusAdmin(req, res, next) {
  try {
    const { id } = validatedParams(req);
    const { status } = validatedBody(req);
    const [result] = await (await import('../config/db.js')).db.execute(
      'UPDATE Milestones SET status = ?, updatedAt = NOW() WHERE id = ?',
      [status, id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Milestone not found.' });
    return res.status(200).json({ message: 'Milestone status updated.' });
  } catch (err) {
    next(err);
  }
}