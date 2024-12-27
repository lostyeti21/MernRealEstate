import RealEstateCompany from "../models/realestatecompany.model.js";
import User from "../models/user.model.js";
import bcryptjs from "bcryptjs";

export const addLinkedAccounts = async (req, res) => {
  const { agents } = req.body;

  // Validate request body
  if (!agents || !Array.isArray(agents) || agents.length === 0) {
    return res.status(400).json({ 
      success: false, 
      message: "Invalid agents data. Please provide an array of agent objects." 
    });
  }

  try {
    // Verify the authenticated user's role and company
    const adminUser = await User.findById(req.user.id);
    if (!adminUser || !adminUser.isRealEstateAccount) {
      return res.status(403).json({ 
        success: false, 
        message: "Unauthorized action. You must be a company administrator to add agents." 
      });
    }

    const company = await RealEstateCompany.findById(adminUser.realEstateCompany);
    if (!company) {
      return res.status(404).json({ 
        success: false, 
        message: "Real estate company not found." 
      });
    }

    // Process each agent
    const agentPromises = agents.map(async (agent) => {
      // Validate each agent's data
      if (!agent.email || !agent.password) {
        console.warn(`Skipping agent due to missing fields: ${JSON.stringify(agent)}`);
        return null;
      }

      // Check if the agent's email is already registered
      const existingAgent = await User.findOne({ email: agent.email });
      if (existingAgent) {
        console.warn(`Agent with email ${agent.email} already exists. Skipping.`);
        return null;
      }

      // Hash the agent's password
      const hashedPassword = bcryptjs.hashSync(agent.password, 10);

      // Create the new agent
      const newAgent = new User({
        username: `${agent.email.split("@")[0]}-${company.companyName}`,
        email: agent.email,
        password: hashedPassword,
        realEstateCompany: company._id,
      });

      // Save the agent and link them to the company
      const savedAgent = await newAgent.save();
      company.agents.push(savedAgent._id);
      return savedAgent;
    });

    const savedAgents = await Promise.all(agentPromises);

    // Filter out null values for agents that were skipped
    const validAgents = savedAgents.filter((agent) => agent !== null);

    // Save the company with the updated agent list
    await company.save();

    res.status(201).json({
      success: true,
      message: `${validAgents.length} agents added successfully.`,
      agents: validAgents,
    });
  } catch (error) {
    console.error("Error adding linked accounts:", error.message);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error. Please try again later." 
    });
  }
};
