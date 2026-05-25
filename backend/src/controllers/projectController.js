import * as projectService from "../services/projectService.js";
import {
  validatedBody,
  validatedParams,
  validatedQuery,
} from "../middleware/validateRequest.js";

export async function getProjectsWithFreelancer(req, res, next) {
  try {
    const projects = await projectService.getProjectsWithFreelancer();
    return res.status(200).json({ projects });
  } catch (err) {
    if (err.statusCode)
      return res.status(err.statusCode).json({ message: err.message });
    next(err);
  }
}

export async function getProjectsWithoutFreelancer(req, res, next) {
  try {
    const projects = await projectService.getProjectsWithoutFreelancer();
    return res.status(200).json({ projects });
  } catch (err) {
    if (err.statusCode)
      return res.status(err.statusCode).json({ message: err.message });
    next(err);
  }
}

export async function getClientList(req, res, next) {
  try {
    const clients = await projectService.getClientList();
    return res.status(200).json({ clients });
  } catch (err) {
    if (err.statusCode)
      return res.status(err.statusCode).json({ message: err.message });
    next(err);
  }
}

export async function createProject(req, res, next) {
  try {
    const project = await projectService.createProject(validatedBody(req));
    return res
      .status(201)
      .json({ message: "Project created successfully.", project });
  } catch (err) {
    if (err.statusCode)
      return res.status(err.statusCode).json({ message: err.message });
    next(err);
  }
}

export async function updateProject(req, res, next) {
  try {
    const { id } = validatedParams(req);
    const project = await projectService.updateProject(id, validatedBody(req));
    return res
      .status(200)
      .json({ message: "Project updated successfully.", project });
  } catch (err) {
    if (err.statusCode)
      return res.status(err.statusCode).json({ message: err.message });
    next(err);
  }
}

export async function deleteProject(req, res, next) {
  try {
    const { id } = validatedParams(req);
    const result = await projectService.deleteProject(id);
    return res
      .status(200)
      .json({ message: "Project deleted successfully.", ...result });
  } catch (err) {
    if (err.statusCode)
      return res.status(err.statusCode).json({ message: err.message });
    next(err);
  }
}


export async function browseProjects(req, res, next) {
  try {
    const result = await projectService.browseProjectsForFreelancer(
      req.user.id,
      validatedQuery(req),
    );
    return res.status(200).json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
}

export async function getFreelancerProjectDetails(req, res, next) {
  try {
    const { projectId } = validatedParams(req);
    const project = await projectService.getFreelancerProjectDetails(
      req.user.id,
      projectId,
    );
    return res.status(200).json({ project });
  } catch (err) {
    if (err.statusCode)
      return res.status(err.statusCode).json({ message: err.message });
    next(err);
  }
}

export async function createApplication(req, res, next) {
    try {
        const { projectId } = validatedParams(req);
        const result = await projectService.createApplication(
            req.user.id,
            projectId,
            validatedBody(req),
        );
        return res.status(201).json({ 
            message: "Application submitted successfully.", 
            ...result 
        });
    } catch (err) {
        if (err.statusCode) return res.status(err.statusCode).json({ message: err.message });
        next(err);
    }
}

    export async function updateMyApplication(req, res, next) {
      try {
        const { applicationId } = validatedParams(req);
        const application = await projectService.updateMyApplication(
          req.user.id,
          applicationId,
          validatedBody(req),
        );
        return res.status(200).json({
          message: "Application updated successfully.",
          application,
        });
      } catch (err) {
        if (err.statusCode) return res.status(err.statusCode).json({ message: err.message });
        next(err);
      }
    }

    export async function softDeleteMyApplication(req, res, next) {
      try {
        const { applicationId } = validatedParams(req);
        const result = await projectService.softDeleteMyApplication(
          req.user.id,
          applicationId,
        );
        return res.status(200).json({
          message: "Application withdrawn successfully.",
          ...result,
        });
      } catch (err) {
        if (err.statusCode) return res.status(err.statusCode).json({ message: err.message });
        next(err);
      }
    }

export async function getMyApplications(req, res, next) {
    try {
        const applications = await projectService.getMyApplications(req.user.id);
        return res.status(200).json({ applications });
    } catch (err) {
        if (err.statusCode) return res.status(err.statusCode).json({ message: err.message });
        next(err);
    }
}